import React, { Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { OrderProvider } from "./context/OrderContext";
import { ReturnProvider } from "./context/ReturnContext";
import { ReferralProvider } from "./context/ReferralContext";
import { HeroNavProvider } from "./context/HeroNavContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { lazyPage } from "./utils/lazyPage";

// Layouts
import { MainLayout } from "./layouts/MainLayout";
import { PageSkeleton } from "./components/common/Skeleton";
const AdminLayout = lazyPage(() => import("./layouts/AdminLayout"), "AdminLayout");

// Customer Storefront Pages
import { HomePage } from "./pages/HomePage";
const CatalogPage = lazyPage(() => import("./pages/CatalogPage"), "CatalogPage");
const CategoryPage = lazyPage(() => import("./pages/CategoryPage"), "CategoryPage");
const ProductDetailPage = lazyPage(() => import("./pages/ProductDetailPage"), "ProductDetailPage");
const CartPage = lazyPage(() => import("./pages/CartPage"), "CartPage");
const WishlistPage = lazyPage(() => import("./pages/WishlistPage"), "WishlistPage");
const CheckoutPage = lazyPage(() => import("./pages/CheckoutPage"), "CheckoutPage");
const OrderConfirmationPage = lazyPage(() => import("./pages/OrderConfirmationPage"), "OrderConfirmationPage");
const TrackOrderPage = lazyPage(() => import("./pages/TrackOrderPage"), "TrackOrderPage");
const LoginPage = lazyPage(() => import("./pages/LoginPage"), "LoginPage");
const RegisterPage = lazyPage(() => import("./pages/RegisterPage"), "RegisterPage");
const ForgotPasswordPage = lazyPage(() => import("./pages/ForgotPasswordPage"), "ForgotPasswordPage");
const AccountPage = lazyPage(() => import("./pages/AccountPage"), "AccountPage");
const ReferralPage = lazyPage(() => import("./pages/ReferralPage"), "ReferralPage");
const AboutPage = lazyPage(() => import("./pages/AboutPage"), "AboutPage");
const CustomerReviewsPage = lazyPage(() => import("./pages/CustomerReviewsPage"), "CustomerReviewsPage");
const OurStoryPage = lazyPage(() => import("./pages/OurStoryPage"), "OurStoryPage");
const AyurvedaEduPage = lazyPage(() => import("./pages/AyurvedaEduPage"), "AyurvedaEduPage");
const IngredientsPage = lazyPage(() => import("./pages/IngredientsPage"), "IngredientsPage");
const BlogListPage = lazyPage(() => import("./pages/BlogListPage"), "BlogListPage");
const BlogPostDetailPage = lazyPage(() => import("./pages/BlogPostDetailPage"), "BlogPostDetailPage");
const FaqPage = lazyPage(() => import("./pages/FaqPage"), "FaqPage");
const ContactPage = lazyPage(() => import("./pages/ContactPage"), "ContactPage");
const OffersPage = lazyPage(() => import("./pages/OffersPage"), "OffersPage");
const ShippingPage = lazyPage(() => import("./pages/ShippingPage"), "ShippingPage");
const ReturnsPage = lazyPage(() => import("./pages/ReturnsPage"), "ReturnsPage");
const PrivacyPage = lazyPage(() => import("./pages/PrivacyPage"), "PrivacyPage");
const TermsPage = lazyPage(() => import("./pages/TermsPage"), "TermsPage");
import { NotFoundPage } from "./pages/NotFoundPage";

// Admin Dashboard Pages
const DashboardPage = lazyPage(() => import("./pages/admin/DashboardPage"), "DashboardPage");
const ProductsPage = lazyPage(() => import("./pages/admin/ProductsPage"), "ProductsPage");
const ProductFormPage = lazyPage(() => import("./pages/admin/ProductFormPage"), "ProductFormPage");
const CategoriesPage = lazyPage(() => import("./pages/admin/CategoriesPage"), "CategoriesPage");
const BrandsPage = lazyPage(() => import("./pages/admin/BrandsPage"), "BrandsPage");
const CollectionsPage = lazyPage(() => import("./pages/admin/CollectionsPage"), "CollectionsPage");
const InventoryPage = lazyPage(() => import("./pages/admin/InventoryPage"), "InventoryPage");
const IngredientsAdminPage = lazyPage(() => import("./pages/admin/IngredientsAdminPage"), "IngredientsAdminPage");
const OrdersPage = lazyPage(() => import("./pages/admin/OrdersPage"), "OrdersPage");
const OrderDetailsPage = lazyPage(() => import("./pages/admin/OrderDetailsPage"), "OrderDetailsPage");
const ReturnsRefundsPage = lazyPage(() => import("./pages/admin/ReturnsRefundsPage"), "ReturnsRefundsPage");
const CouponsPage = lazyPage(() => import("./pages/admin/CouponsPage"), "CouponsPage");
const CustomersPage = lazyPage(() => import("./pages/admin/CustomersPage"), "CustomersPage");
const CustomerDetailsPage = lazyPage(() => import("./pages/admin/CustomerDetailsPage"), "CustomerDetailsPage");
const AdminReferralsPage = lazyPage(() => import("./pages/admin/AdminReferralsPage"), "AdminReferralsPage");
const ReviewsPage = lazyPage(() => import("./pages/admin/ReviewsPage"), "ReviewsPage");
const ContentPagesPage = lazyPage(() => import("./pages/admin/ContentPagesPage"), "ContentPagesPage");
const BlogAdminPage = lazyPage(() => import("./pages/admin/BlogAdminPage"), "BlogAdminPage");
const EnquiriesPage = lazyPage(() => import("./pages/admin/EnquiriesPage"), "EnquiriesPage");
const SupportTicketsPage = lazyPage(() => import("./pages/admin/SupportTicketsPage"), "SupportTicketsPage");
const SubscribersPage = lazyPage(() => import("./pages/admin/SubscribersPage"), "SubscribersPage");
const ReportsPage = lazyPage(() => import("./pages/admin/ReportsPage"), "ReportsPage");
const AdminUsersPage = lazyPage(() => import("./pages/admin/AdminUsersPage"), "AdminUsersPage");
const RolesPage = lazyPage(() => import("./pages/admin/RolesPage"), "RolesPage");
const AuditLogsPage = lazyPage(() => import("./pages/admin/AuditLogsPage"), "AuditLogsPage");
const SettingsPage = lazyPage(() => import("./pages/admin/SettingsPage"), "SettingsPage");
import { SmoothScroll } from "./animations/SmoothScroll";
import { LiveOrderToast } from "./components/common/LiveOrderToast";

export const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <AdminProvider>
        <AuthProvider>
          <ReferralProvider>
            <WishlistProvider>
              <CartProvider>
                <OrderProvider>
                  <ReturnProvider>
                  <HeroNavProvider>
                    <SmoothScroll>
                    <Routes>
                  {/* ======================================================== */}
                  {/* ADMIN AUTHENTICATION (Redirects to unified /login) */}
                  {/* ======================================================== */}
                  <Route path="/admin/login" element={<Navigate to="/login" replace />} />

                  {/* ======================================================== */}
                  {/* PROTECTED ADMIN CONTROL CENTER */}
                  {/* ======================================================== */}
                  <Route
                    path="/admin"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <AdminLayout />
                      </Suspense>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route path="dashboard" element={<DashboardPage />} />

                    {/* Catalog Management */}
                    <Route path="products" element={<ProductsPage />} />
                    <Route path="products/new" element={<ProductFormPage />} />
                    <Route path="products/:productId/edit" element={<ProductFormPage />} />
                    <Route path="categories" element={<CategoriesPage />} />
                    <Route path="brands" element={<BrandsPage />} />
                    <Route path="collections" element={<CollectionsPage />} />
                    <Route path="inventory" element={<InventoryPage />} />
                    <Route path="ingredients" element={<IngredientsAdminPage />} />

                    {/* Sales & Orders */}
                    <Route path="orders" element={<OrdersPage />} />
                    <Route path="orders/:orderId" element={<OrderDetailsPage />} />
                    <Route path="returns-refunds" element={<ReturnsRefundsPage />} />
                    <Route path="coupons" element={<CouponsPage />} />

                    {/* Customers & Feedback */}
                    <Route path="customers" element={<CustomersPage />} />
                    <Route path="customers/:customerId" element={<CustomerDetailsPage />} />
                    <Route path="referrals" element={<AdminReferralsPage />} />
                    <Route path="reviews" element={<ReviewsPage />} />

                    {/* Storefront Customization */}
                    <Route path="content-pages" element={<ContentPagesPage />} />
                    <Route path="blog" element={<BlogAdminPage />} />

                    {/* Communications & Support */}
                    <Route path="enquiries" element={<EnquiriesPage />} />
                    <Route path="support-tickets" element={<SupportTicketsPage />} />
                    <Route path="subscribers" element={<SubscribersPage />} />

                    {/* Analytics & Reports */}
                    <Route path="reports" element={<ReportsPage />} />

                    {/* Administration & Staff */}
                    <Route path="users" element={<AdminUsersPage />} />
                    <Route path="roles" element={<RolesPage />} />
                    <Route path="audit-logs" element={<AuditLogsPage />} />

                    {/* Configuration */}
                    <Route path="settings" element={<SettingsPage />} />
                  </Route>

                  {/* ======================================================== */}
                  {/* CUSTOMER-FACING PUBLIC STOREFRONT */}
                  {/* ======================================================== */}
                  <Route path="/" element={<MainLayout />}>
                    {/* Home */}
                    <Route index element={<HomePage />} />

                    {/* Catalog & Products */}
                    <Route path="products" element={<CatalogPage />} />
                    <Route path="products/:slug" element={<ProductDetailPage />} />
                    <Route path="product/:slug" element={<ProductDetailPage />} />
                    <Route path="category/:slug" element={<CategoryPage />} />

                    {/* Shopping & Checkout */}
                    <Route path="cart" element={<CartPage />} />
                    <Route path="wishlist" element={<WishlistPage />} />
                    <Route path="checkout" element={<CheckoutPage />} />
                    <Route path="order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                    <Route path="track-order" element={<TrackOrderPage />} />

                    {/* Account & Auth */}
                    <Route path="login" element={<LoginPage />} />
                    <Route path="register" element={<RegisterPage />} />
                    <Route path="forgot-password" element={<ForgotPasswordPage />} />
                    <Route path="account" element={<AccountPage />} />
                    <Route path="account/profile" element={<AccountPage />} />
                    <Route path="account/addresses" element={<AccountPage />} />
                    <Route path="account/orders" element={<AccountPage />} />
                    <Route path="account/orders/:orderId" element={<AccountPage />} />
                    <Route path="account/referrals" element={<AccountPage />} />
                    <Route path="referrals" element={<ReferralPage />} />

                    {/* Informational & Support */}
                    <Route path="about" element={<AboutPage />} />
                    <Route path="reviews" element={<CustomerReviewsPage />} />
                    <Route path="our-story" element={<OurStoryPage />} />
                    <Route path="ayurveda" element={<AyurvedaEduPage />} />
                    <Route path="ingredients" element={<IngredientsPage />} />
                    <Route path="blog" element={<BlogListPage />} />
                    <Route path="blog/:slug" element={<BlogPostDetailPage />} />
                    <Route path="faq" element={<FaqPage />} />
                    <Route path="contact" element={<ContactPage />} />
                    <Route path="offers" element={<OffersPage />} />
                    <Route path="shipping" element={<ShippingPage />} />
                    <Route path="returns" element={<ReturnsPage />} />
                    <Route path="privacy" element={<PrivacyPage />} />
                    <Route path="terms" element={<TermsPage />} />

                    {/* 404 Catch-All */}
                    <Route path="*" element={<NotFoundPage />} />
                  </Route>
                </Routes>
                <LiveOrderToast />
                    </SmoothScroll>
                  </HeroNavProvider>
                  </ReturnProvider>
                </OrderProvider>
            </CartProvider>
          </WishlistProvider>
        </ReferralProvider>
      </AuthProvider>
    </AdminProvider>
  </BrowserRouter>
</ErrorBoundary>
);
};

export default App;
