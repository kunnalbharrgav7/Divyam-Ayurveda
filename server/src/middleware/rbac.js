import { ApiError } from "../utils/apiError.js";
import { ROLES } from "../constants/roles.js";

export const requirePermission = (permission) => (req, res, next) => {
  if (!req.user) {
    return next(ApiError.unauthorized("Authentication required"));
  }

  if (!req.user.isStaff) {
    return next(ApiError.forbidden("Access denied: Not a staff account"));
  }

  const userRoles = req.user.roles || [];
  const isSuperAdmin = userRoles.some(
    (role) => role.name === ROLES.SUPER_ADMIN || role.name === "Super Admin"
  );

  if (isSuperAdmin) {
    return next();
  }

  const hasPerm = userRoles.some((role) =>
    Array.isArray(role.permissions) && role.permissions.includes(permission)
  );

  if (!hasPerm) {
    return next(
      ApiError.forbidden(`Access denied. Missing required permission: ${permission}`)
    );
  }

  next();
};

/**
 * A staff member on a temporary password may only read their own profile and set a new password; everything else
 * in the admin API is refused until they have done it. Mount right after the staff guard.
 */
export const requirePasswordChanged = (req, res, next) => {
  if (!req.user?.mustChangePassword) return next();
  const allowed =
    (req.method === "GET" && req.path === "/profile") || (req.method === "PATCH" && req.path === "/profile/password");
  if (allowed) return next();
  return next(
    ApiError.forbidden("You must set a new password before using the admin area. Open Profile & Security.", {
      code: "PASSWORD_CHANGE_REQUIRED",
    })
  );
};

/** Team management (the /admin/users routes) belongs to the owner of the store alone. */
export const requireOwner = (req, res, next) => {
  if (!req.user) return next(ApiError.unauthorized("Authentication required"));
  if (!req.user.isOwner) return next(ApiError.forbidden("Only the store owner can manage the admin team."));
  next();
};
