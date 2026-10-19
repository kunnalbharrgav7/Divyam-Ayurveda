import { Router } from "express";
import * as adminController from "../../controllers/admin.controller.js";
import * as returnController from "../../controllers/return.controller.js";
import { authenticate, requireStaff } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/rbac.js";
import { PERMISSIONS } from "../../constants/permissions.js";
import { requireIdempotency } from "../../middleware/idempotency.js";

const router = Router();

// Staff authentication guard for all admin routes
router.use(authenticate, requireStaff);

// Dashboard & Analytics
router.get("/dashboard", requirePermission(PERMISSIONS.REPORTS_VIEW), adminController.getDashboard);
router.get("/reports/revenue", requirePermission(PERMISSIONS.REPORTS_VIEW), adminController.getRevenueReport);
router.get("/reports/sales", requirePermission(PERMISSIONS.REPORTS_VIEW), adminController.getSalesReport);

// Catalog: Products & Inventory
router.get("/products", requirePermission(PERMISSIONS.PRODUCTS_VIEW), adminController.listAdminProducts);
router.post("/products", requirePermission(PERMISSIONS.PRODUCTS_CREATE), adminController.createProduct);
router.patch("/products/:id", requirePermission(PERMISSIONS.PRODUCTS_EDIT), adminController.updateProduct);
router.delete("/products/:id", requirePermission(PERMISSIONS.PRODUCTS_DELETE), adminController.deleteProduct);

router.post(
  "/inventory/adjustments",
  requirePermission(PERMISSIONS.INVENTORY_MANAGE),
  requireIdempotency(false),
  adminController.adjustInventory
);

// Catalog: Categories, Brands, Collections
router.get("/categories", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.listCategories);
router.post("/categories", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.createCategory);
router.patch("/categories/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.updateCategory);
router.delete("/categories/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.deleteCategory);

router.get("/brands", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.listBrands);
router.post("/brands", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.createBrand);
router.patch("/brands/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.updateBrand);
router.delete("/brands/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.deleteBrand);

router.get("/collections", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.listCollections);
router.post("/collections", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.createCollection);
router.patch("/collections/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.updateCollection);
router.delete("/collections/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.deleteCollection);

router.get("/ingredients", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.listAdminIngredients);
router.post("/ingredients", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.createIngredient);
router.patch("/ingredients/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.updateIngredient);
router.delete("/ingredients/:id", requirePermission(PERMISSIONS.CATEGORIES_MANAGE), adminController.deleteIngredient);

// Orders & Shipments
router.get("/orders", requirePermission(PERMISSIONS.ORDERS_VIEW), adminController.listAdminOrders);
router.get("/orders/:orderNumber", requirePermission(PERMISSIONS.ORDERS_VIEW), adminController.getAdminOrder);
router.patch("/orders/:orderNumber/status", requirePermission(PERMISSIONS.ORDERS_UPDATE), adminController.updateOrderStatus);
router.patch("/orders/:orderNumber/payment-status", requirePermission(PERMISSIONS.ORDERS_UPDATE), adminController.updatePaymentStatus);
router.post("/orders/:orderNumber/shipments", requirePermission(PERMISSIONS.ORDERS_UPDATE), adminController.createShipment);
router.post("/orders/:orderNumber/shipments/advance", requirePermission(PERMISSIONS.ORDERS_UPDATE), adminController.advanceShipment);
router.patch("/orders/:orderNumber/tracking", requirePermission(PERMISSIONS.ORDERS_UPDATE), adminController.updateOrderTracking);
router.get("/orders/:orderNumber/shipment", requirePermission(PERMISSIONS.ORDERS_VIEW), adminController.getOrderShipment);
router.post("/orders/:orderNumber/cancel", requirePermission(PERMISSIONS.ORDERS_UPDATE), adminController.cancelOrder);

// Returns & Refunds
router.get("/returns", requirePermission(PERMISSIONS.REFUNDS_MANAGE), returnController.listAdminReturns);
router.get("/returns/:id", requirePermission(PERMISSIONS.REFUNDS_MANAGE), returnController.getAdminReturn);
router.post("/returns/:id/approve", requirePermission(PERMISSIONS.REFUNDS_MANAGE), returnController.approveReturn);
router.post("/returns/:id/reject", requirePermission(PERMISSIONS.REFUNDS_MANAGE), returnController.rejectReturn);
router.post("/returns/:id/receive", requirePermission(PERMISSIONS.REFUNDS_MANAGE), returnController.receiveReturn);
router.post("/returns/:id/refund", requirePermission(PERMISSIONS.REFUNDS_MANAGE), returnController.refundReturn);
router.post("/returns/:id/refund/refresh", requirePermission(PERMISSIONS.REFUNDS_MANAGE), returnController.refreshReturnRefund);

// Coupons
router.get("/coupons", requirePermission(PERMISSIONS.DISCOUNTS_MANAGE), adminController.listCoupons);
router.post("/coupons", requirePermission(PERMISSIONS.DISCOUNTS_MANAGE), adminController.createCoupon);
router.patch("/coupons/:id", requirePermission(PERMISSIONS.DISCOUNTS_MANAGE), adminController.updateCoupon);
router.delete("/coupons/:id", requirePermission(PERMISSIONS.DISCOUNTS_MANAGE), adminController.deleteCoupon);

// Referrals & Rewards Program
router.get("/referrals", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), adminController.listReferrals);
router.get("/referrals/settings", requirePermission(PERMISSIONS.SETTINGS_MANAGE), adminController.getReferralProgram);
router.put("/referrals/settings", requirePermission(PERMISSIONS.SETTINGS_MANAGE), adminController.updateReferralProgram);
router.get("/referrals/export", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), adminController.exportReferrals);
router.post("/referrals/:id/approve", requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), adminController.approveReferral);
router.post("/referrals/:id/void", requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), adminController.voidReferral);

// Review Moderation
router.get("/reviews", requirePermission(PERMISSIONS.REVIEWS_MODERATE), adminController.listAdminReviews);
router.patch("/reviews/:id", requirePermission(PERMISSIONS.REVIEWS_MODERATE), adminController.moderateReview);
router.delete("/reviews/:id", requirePermission(PERMISSIONS.REVIEWS_MODERATE), adminController.deleteReview);

// Customer Support & Communications
router.get("/enquiries", requirePermission(PERMISSIONS.SUPPORT_MANAGE), adminController.listEnquiries);
router.get("/support-tickets", requirePermission(PERMISSIONS.SUPPORT_MANAGE), adminController.listSupportTickets);
router.get("/subscribers", requirePermission(PERMISSIONS.SUPPORT_MANAGE), adminController.listSubscribers);

// Storefront Content & Settings
router.get("/homepage", requirePermission(PERMISSIONS.CONTENT_MANAGE), adminController.getHomepageAdmin);
router.patch("/homepage", requirePermission(PERMISSIONS.CONTENT_MANAGE), adminController.updateHomepageAdmin);
router.get("/blog", requirePermission(PERMISSIONS.CONTENT_MANAGE), adminController.listAdminBlogPosts);
router.post("/blog", requirePermission(PERMISSIONS.CONTENT_MANAGE), adminController.createBlogPost);
router.patch("/blog/:id", requirePermission(PERMISSIONS.CONTENT_MANAGE), adminController.updateBlogPost);
router.delete("/blog/:id", requirePermission(PERMISSIONS.CONTENT_MANAGE), adminController.deleteBlogPost);
router.get("/settings", requirePermission(PERMISSIONS.SETTINGS_MANAGE), adminController.getSettings);
router.patch("/settings", requirePermission(PERMISSIONS.SETTINGS_MANAGE), adminController.updateSettings);

// Users, Roles & Governance
router.get("/customers", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), adminController.listCustomers);
router.get("/customers/:id", requirePermission(PERMISSIONS.CUSTOMERS_VIEW), adminController.getCustomer);
router.patch("/customers/:id", requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), adminController.updateCustomerStatus);
router.post("/customers/:id/notes", requirePermission(PERMISSIONS.CUSTOMERS_MANAGE), adminController.addCustomerNote);
router.get("/users", requirePermission(PERMISSIONS.USERS_MANAGE), adminController.listAdminUsers);
router.post("/users", requirePermission(PERMISSIONS.USERS_MANAGE), adminController.createAdminUser);
router.get("/roles", requirePermission(PERMISSIONS.ROLES_MANAGE), adminController.listRoles);
router.get("/audit-logs", requirePermission(PERMISSIONS.AUDIT_VIEW), adminController.listAuditLogs);

export default router;

