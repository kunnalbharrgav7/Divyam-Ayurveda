import { AuditLog } from "../models/AuditLog.js";
import { logger } from "../config/logger.js";

/**
 * Audit snapshots must stay small: product photos are stored as base64 data URLs (hundreds of KB each),
 * which once made single audit entries several MB. Inline images and very long strings are shortened.
 */
export const sanitizeForAudit = (value, depth = 0) => {
  if (typeof value === "string") {
    if (value.startsWith("data:")) return "[inline image omitted]";
    return value.length > 2000 ? `${value.slice(0, 2000)}…` : value;
  }
  if (depth > 8 || value === null || typeof value !== "object") return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) return value.map((item) => sanitizeForAudit(item, depth + 1));
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, sanitizeForAudit(v, depth + 1)]));
};

export const logAudit = async ({
  actorId = null,
  actorName = "System",
  actorRole = "System",
  action,
  module,
  targetId = null,
  details = "",
  before = null,
  after = null,
  ip = "",
  userAgent = "",
  requestId = null,
}) => {
  try {
    await AuditLog.create({
      actorId,
      actorName,
      actorRole,
      action,
      module,
      targetId: targetId ? String(targetId) : null,
      details,
      before: sanitizeForAudit(before),
      after: sanitizeForAudit(after),
      ip,
      userAgent,
      requestId,
    });
  } catch (err) {
    logger.warn({ err: err.message, action, module }, "Failed to write audit log record");
  }
};

