/**
 * Seed Admin Users, Roles, and Permissions Matrix
 */

export const PERMISSIONS_LIST = [
  { id: "products.view", label: "View Products", module: "Catalog" },
  { id: "products.create", label: "Create Products", module: "Catalog" },
  { id: "products.edit", label: "Edit Products", module: "Catalog" },
  { id: "products.delete", label: "Delete Products", module: "Catalog" },
  { id: "inventory.manage", label: "Manage Inventory & Adjustments", module: "Catalog" },
  { id: "categories.manage", label: "Manage Categories & Brands", module: "Catalog" },
  { id: "orders.view", label: "View Orders", module: "Sales" },
  { id: "orders.update", label: "Update Order Status & Dispatch", module: "Sales" },
  { id: "refunds.manage", label: "Manage Returns & Refunds", module: "Sales" },
  { id: "discounts.manage", label: "Manage Coupons & Offers", module: "Sales" },
  { id: "customers.view", label: "View Customer Profiles", module: "Customers" },
  { id: "customers.manage", label: "Manage Customer Accounts", module: "Customers" },
  { id: "reviews.moderate", label: "Moderate Reviews & Questions", module: "Customers" },
  { id: "support.manage", label: "Handle Inquiries & Tickets", module: "Customers" },
  { id: "content.manage", label: "Homepage Builder, Banners & Blog", module: "Storefront" },
  { id: "reports.view", label: "View Analytics & Reports", module: "Analytics" },
  { id: "users.manage", label: "Manage Admin Team Users", module: "Administration" },
  { id: "roles.manage", label: "Manage Roles & Permissions", module: "Administration" },
  { id: "settings.manage", label: "Store & System Settings", module: "Configuration" },
  { id: "audit.view", label: "View Audit Activity Logs", module: "Administration" },
];

export const ROLE_DEFINITIONS = {
  "Super Admin": {
    name: "Super Admin",
    description: "Unrestricted administrative control across all store operations and configurations.",
    permissions: PERMISSIONS_LIST.map((p) => p.id),
  },
};

// Aliases for programmatic and snake_case references
ROLE_DEFINITIONS.super_admin = ROLE_DEFINITIONS["Super Admin"];
ROLE_DEFINITIONS.admin = ROLE_DEFINITIONS["Super Admin"];

export const initialAdminUsers = [
  {
    id: "admin-01",
    name: "Divyam Store Administrator",
    email: "admin@divyamayurveda.demo",
    role: "Super Admin",
    phone: "+91 98765 00001",
    status: "active",
    lastLogin: "Just now",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
    createdAt: "2024-01-01T00:00:00Z",
  },
];


