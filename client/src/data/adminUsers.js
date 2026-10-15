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
  "Admin": {
    name: "Admin",
    description: "Broad store operations management excluding sensitive role delegation.",
    permissions: PERMISSIONS_LIST.filter((p) => p.id !== "roles.manage" && p.id !== "users.manage").map((p) => p.id),
  },
  "Product Manager": {
    name: "Product Manager",
    description: "Dedicated access to products, categories, brands, collections, and stock inventory.",
    permissions: [
      "products.view",
      "products.create",
      "products.edit",
      "products.delete",
      "inventory.manage",
      "categories.manage",
      "reports.view",
    ],
  },
  "Order Manager": {
    name: "Order Manager",
    description: "Fulfillment and delivery processing, customer shipping, returns, and refunds.",
    permissions: [
      "orders.view",
      "orders.update",
      "refunds.manage",
      "customers.view",
      "reports.view",
    ],
  },
  "Content Manager": {
    name: "Content Manager",
    description: "Homepage sections, banner management, informational pages, and blog management.",
    permissions: [
      "content.manage",
      "discounts.manage",
      "products.view",
    ],
  },
  "Support Specialist": {
    name: "Support Specialist",
    description: "Review moderation, contact inquiries, support tickets, and customer inquiries.",
    permissions: [
      "support.manage",
      "reviews.moderate",
      "customers.view",
      "orders.view",
    ],
  },
  "Analyst": {
    name: "Analyst",
    description: "Read-only analytics, financial performance, and inventory metrics.",
    permissions: [
      "reports.view",
      "products.view",
      "orders.view",
      "customers.view",
    ],
  },
};

// Aliases for programmatic and snake_case references
ROLE_DEFINITIONS.catalog_manager = ROLE_DEFINITIONS["Product Manager"];
ROLE_DEFINITIONS.order_fulfillment = ROLE_DEFINITIONS["Order Manager"];
ROLE_DEFINITIONS.customer_support = ROLE_DEFINITIONS["Support Specialist"];
ROLE_DEFINITIONS.marketing_manager = ROLE_DEFINITIONS["Content Manager"];
ROLE_DEFINITIONS.super_admin = ROLE_DEFINITIONS["Super Admin"];
ROLE_DEFINITIONS.admin = ROLE_DEFINITIONS["Admin"];
ROLE_DEFINITIONS.analyst = ROLE_DEFINITIONS["Analyst"];

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
  {
    id: "admin-02",
    name: "Dr. Rajesh Sharma",
    email: "rajesh@divyamayurveda.demo",
    role: "Product Manager",
    phone: "+91 98765 00002",
    status: "active",
    lastLogin: "2 hours ago",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80",
    createdAt: "2024-03-15T00:00:00Z",
  },
  {
    id: "admin-03",
    name: "Sunita Verma",
    email: "sunita@divyamayurveda.demo",
    role: "Order Manager",
    phone: "+91 98765 00003",
    status: "active",
    lastLogin: "Yesterday",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80",
    createdAt: "2024-04-10T00:00:00Z",
  },
  {
    id: "admin-04",
    name: "Rohan Nair",
    email: "rohan@divyamayurveda.demo",
    role: "Support Specialist",
    phone: "+91 98765 00004",
    status: "active",
    lastLogin: "3 days ago",
    avatar: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80",
    createdAt: "2024-05-20T00:00:00Z",
  },
  {
    id: "admin-05",
    name: "Meenakshi Iyer",
    email: "meenakshi@divyamayurveda.demo",
    role: "Analyst",
    phone: "+91 98765 00005",
    status: "active",
    lastLogin: "5 days ago",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=200&q=80",
    createdAt: "2024-06-01T00:00:00Z",
  },
];

