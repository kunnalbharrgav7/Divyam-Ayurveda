import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";
import { CartProvider } from "./context/CartContext";
import { WishlistProvider } from "./context/WishlistContext";
import { OrderProvider } from "./context/OrderContext";
import { ErrorBoundary } from "./components/common/ErrorBoundary";

// Layouts
import { MainLayout } from "./layouts/MainLayout";
import { AdminLayout } from "./layouts/AdminLayout";

// Customer Storefront Pages
import { HomePage } from "./pages/HomePage";
import { CatalogPage } from "./pages/CatalogPage";
import { CategoryPage } from "./pages/CategoryPage";
import { ProductDetailPage } from "./pages/ProductDetailPage";
import { CartPage } from "./pages/CartPage";
import { WishlistPage } from "./pages/WishlistPage";
import { CheckoutPage } from "./pages/CheckoutPage";
import { OrderConfirmationPage } from "./pages/OrderConfirmationPage";
import { TrackOrderPage } from "./pages/TrackOrderPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { AccountPage } from "./pages/AccountPage";
import { AboutPage } from "./pages/AboutPage";
import { OurStoryPage } from "./pages/OurStoryPage";
import { AyurvedaEduPage } from "./pages/AyurvedaEduPage";
import { IngredientsPage } from "./pages/IngredientsPage";
import { BlogListPage } from "./pages/BlogListPage";
import { BlogPostDetailPage } from "./pages/BlogPostDetailPage";
import { FaqPage } from "./pages/FaqPage";
import { ContactPage } from "./pages/ContactPage";
import { OffersPage } from "./pages/OffersPage";
import { ShippingPage } from "./pages/ShippingPage";
import { ReturnsPage } from "./pages/ReturnsPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { TermsPage } from "./pages/TermsPage";
import { NotFoundPage } from "./pages/NotFoundPage";

// Admin Dashboard Pages
import { AdminLoginPage } from "./pages/admin/AdminLoginPage";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { ProductsPage } from "./pages/admin/ProductsPage";
import { ProductFormPage } from "./pages/admin/ProductFormPage";
import { CategoriesPage } from "./pages/admin/CategoriesPage";
import { BrandsPage } from "./pages/admin/BrandsPage";
import { CollectionsPage } from "./pages/admin/CollectionsPage";
import { InventoryPage } from "./pages/admin/InventoryPage";
import { IngredientsAdminPage } from "./pages/admin/IngredientsAdminPage";
import { OrdersPage } from "./pages/admin/OrdersPage";
import { OrderDetailsPage } from "./pages/admin/OrderDetailsPage";
import { ReturnsRefundsPage } from "./pages/admin/ReturnsRefundsPage";
import { CouponsPage } from "./pages/admin/CouponsPage";
import { CustomersPage } from "./pages/admin/CustomersPage";
import { CustomerDetailsPage } from "./pages/admin/CustomerDetailsPage";
import { ReviewsPage } from "./pages/admin/ReviewsPage";
import { HomepageBuilderPage } from "./pages/admin/HomepageBuilderPage";
import { ContentPagesPage } from "./pages/admin/ContentPagesPage";
import { BlogAdminPage } from "./pages/admin/BlogAdminPage";
import { EnquiriesPage } from "./pages/admin/EnquiriesPage";
import { SupportTicketsPage } from "./pages/admin/SupportTicketsPage";
import { SubscribersPage } from "./pages/admin/SubscribersPage";
import { ReportsPage } from "./pages/admin/ReportsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { RolesPage } from "./pages/admin/RolesPage";
import { AuditLogsPage } from "./pages/admin/AuditLogsPage";
import { SettingsPage } from "./pages/admin/SettingsPage";

// Scroll restoration component
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
      <AdminProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <OrderProvider>
                <ScrollToTop />
                <Routes>
                  {/* ======================================================== */}
                  {/* ADMIN AUTHENTICATION & LOGIN */}
                  {/* ======================================================== */}
                  <Route path="/admin/login" element={<AdminLoginPage />} />

                  {/* ======================================================== */}
                  {/* PROTECTED ADMIN CONTROL CENTER */}
                  {/* ======================================================== */}
                  <Route path="/admin" element={<AdminLayout />}>
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
                    <Route path="reviews" element={<ReviewsPage />} />

                    {/* Storefront Customization */}
                    <Route path="homepage-builder" element={<HomepageBuilderPage />} />
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

                    {/* Informational & Support */}
                    <Route path="about" element={<AboutPage />} />
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
              </OrderProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </AdminProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
};

export default App;
