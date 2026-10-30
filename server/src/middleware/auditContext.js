import { logAudit, requestAuditStore } from "../services/audit.service.js";

/**
 * Carries the current admin request through async code, so every audit entry written while handling it
 * records who did it, from where (IP / browser) and under which request id, without each caller passing them.
 */
export const auditContext = requestAuditStore;

const VERBS = { POST: "create", PUT: "update", PATCH: "update", DELETE: "delete" };

// "/products/abc123/edit" -> "products"; ids and trailing words are dropped
const resourceFromPath = (path) => {
  const first = path.split("?")[0].split("/").filter(Boolean)[0] || "admin";
  return first.replace(/-/g, "_");
};

/**
 * Mount on the admin router after authentication. Every state-changing admin request is recorded:
 * handlers that write their own detailed audit entry keep it; any other successful change gets a
 * generic entry (what was changed, by whom, when), so nothing an admin does goes unrecorded.
 * Request bodies are never stored (they can contain secrets).
 */
export const auditAdminMutations = (req, res, next) => {
  const store = {
    req,
    logged: false,
    ip: req.ip || "",
    userAgent: String(req.get("user-agent") || "").slice(0, 300),
    requestId: req.id || null,
  };

  if (!VERBS[req.method]) return auditContext.run(store, next);

  res.on("finish", () => {
    if (store.logged || res.statusCode >= 400 || !req.user) return;
    const resource = resourceFromPath(req.path);
    const verb = VERBS[req.method];
    logAudit({
      actorId: req.user._id,
      actorName: req.user.name,
      actorRole: req.user.roles?.[0]?.name || "Staff",
      action: `${resource}.${verb}`,
      module: resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, " "),
      targetId: req.params?.id || req.params?.orderNumber || null,
      details: `${req.method} /admin${req.path}`,
      ip: store.ip,
      userAgent: store.userAgent,
      requestId: store.requestId,
    });
  });

  return auditContext.run(store, next);
};
