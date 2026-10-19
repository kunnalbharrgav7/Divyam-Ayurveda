import { ALL_PERMISSIONS } from "./permissions.js";

export const ROLES = {
  SUPER_ADMIN: "Super Admin",
};

export const DEFAULT_ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ALL_PERMISSIONS,
};


