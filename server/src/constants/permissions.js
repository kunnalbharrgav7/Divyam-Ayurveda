export const PERMISSIONS = {
  // Catalog
  PRODUCTS_VIEW: "products.view",
  PRODUCTS_CREATE: "products.create",
  PRODUCTS_EDIT: "products.edit",
  PRODUCTS_DELETE: "products.delete",
  INVENTORY_MANAGE: "inventory.manage",
  CATEGORIES_MANAGE: "categories.manage",

  // Sales
  ORDERS_VIEW: "orders.view",
  ORDERS_UPDATE: "orders.update",
  REFUNDS_MANAGE: "refunds.manage",
  DISCOUNTS_MANAGE: "discounts.manage",

  // Customers & Support
  CUSTOMERS_VIEW: "customers.view",
  CUSTOMERS_MANAGE: "customers.manage",
  REVIEWS_MODERATE: "reviews.moderate",
  SUPPORT_MANAGE: "support.manage",

  // Storefront & Content
  CONTENT_MANAGE: "content.manage",

  // Analytics & Admin Governance
  REPORTS_VIEW: "reports.view",
  USERS_MANAGE: "users.manage",
  ROLES_MANAGE: "roles.manage",
  SETTINGS_MANAGE: "settings.manage",
  AUDIT_VIEW: "audit.view",
};

export const ALL_PERMISSIONS = Object.values(PERMISSIONS);

