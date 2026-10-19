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

