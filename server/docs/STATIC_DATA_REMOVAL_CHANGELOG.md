# DIVYAM AYURVEDA — STATIC DATA REMOVAL & ARCHITECTURE CHANGELOG

## 1. Executive Summary

This changelog records the structural refactoring and code modifications performed across the frontend and backend of **Divyam Ayurveda** to eliminate static demo fallbacks, decouple the application from hardcoded data files, and establish authoritative MongoDB database communication.

Following these changes, the application boots cleanly with 0 products, 0 orders, 0 customers, 0 categories, and 0 business artifacts, without falling back to mock datasets or re-injecting demo data upon refresh.

---

## 2. Root Cause Analysis: Why Mock Data Reappeared Previously

1. **Length-Check Fall-through in Frontend API Services (`client/src/services/api.js`)**:
   - Multiple API wrappers used conditional checks such as:
     ```javascript
     if (json.success && Array.isArray(json.data) && json.data.length > 0) {
       return json.data;
     }
     return defaultProducts; // Fallback to hardcoded array
     ```
   - When the MongoDB database was completely clean (`count = 0`), `json.data.length > 0` evaluated to `false`. Instead of returning the authentic empty array (`[]`), the service silently caught or fell through to `defaultProducts`, `defaultCategories`, `defaultCollections`, `defaultTestimonials`, etc., making it appear as if data was never deleted!
2. **Hardcoded Merging in `AdminContext.jsx`**:
   - `fetchAdminOrders()` previously merged backend orders with hardcoded seed orders using `...INITIAL_SEED_ORDERS`.
   - `products`, `categories`, `brands`, `collections`, `customers`, `reviews`, `coupons`, `blogPosts`, `ingredients`, `supportTickets`, `contactEnquiries`, `subscribers`, and `adminUsers` initialized their React state directly from `client/src/data/*.js` seed arrays.
   - The "Reset Demo Data" sidebar button re-seeded `localStorage` with initial mock records upon execution.
3. **Simulated State in `referralService.js`**:
   - `getAllReferralActivity()` defaulted to `INITIAL_REFERRAL_ACTIVITY`.
   - `getCustomerReferralCode()` fell back to `DEMO_REFERRAL_CODES["user-101"]`.
   - `totalShares` was hardcoded to `18`.
4. **Integration Test Fixture Assumption**:
   - Backend tests (`catalog.test.js`, `checkout.test.js`, `webhooks.test.js`, `rbac.test.js`) previously assumed pre-seeded database records and crashed on `null._id` when run on a clean database.

---

## 3. Detailed File-by-File Changelog

### A. Frontend API Service Layer

#### `client/src/services/api.js`
- **Removed Static Fallback Imports**:
  - Removed imports of `products as defaultProducts`, `categories as defaultCategories`, `collections as defaultCollections`, `testimonials as defaultTestimonials`, `blogPosts as defaultBlogPosts`, `ingredients as defaultIngredients`, and `faqs as defaultFaqs`.
- **Decoupled Catalog Methods**:
  - `productService.getProducts()`: Returns backend `json.data` (empty array `[]`) when database has 0 items; throws on network error.
  - `categoryService.getCategories()`: Returns backend `json.data` directly; eliminated `defaultCategories` fallback.
  - `collectionService.getCollections()`: Returns backend `json.data` directly.
  - `ingredientService.getIngredients()`: Returns backend `json.data` directly.
  - `faqService.getFaqs()`: Returns backend `json.data` directly.
  - `testimonialService.getTestimonials()`: Returns backend `json.data` directly.
  - `blogService.getPosts()`: Returns backend `json.data` directly.
- **Order Service Decoupling**:
  - `orderService.createOrder()`: Throws a clear network/server error when order placement fails instead of generating a simulated mock order.

### B. Admin State & Persistence Layer

#### `client/src/context/AdminContext.jsx`
- **Eliminated Seed Imports**:
  - Removed `seedProducts`, `seedCategories`, `seedCollections`, `seedBlogPosts`, `seedIngredients`, `initialBrands`, `initialCustomers`, `initialReviews`, `initialCoupons`, `initialSupportTickets`, `initialContactEnquiries`, `initialSubscribers`, and `initialAdminUsers`.
  - Preserved only `ROLE_DEFINITIONS`, `initialHomepageContent`, and `initialStoreSettings`.
- **Clean Empty Defaults**:
  - Set `INITIAL_SEED_ORDERS = []`.
  - Initialized all entity states (`products`, `categories`, `brands`, `collections`, `orders`, `customers`, `reviews`, `coupons`, `blogPosts`, `ingredients`, `supportTickets`, `contactEnquiries`, `subscribers`, `adminUsers`, `auditLogs`) to `storage.get(KEY, [])`.
- **Integrated Full Suite of Admin Fetchers**:
  - `fetchAdminOrders`: Fetches from `GET /api/v1/admin/orders?limit=100`, updates state and storage with authoritative backend data without appending mock seeds.
  - `fetchAdminProducts`: Fetches from `GET /api/v1/admin/products?limit=100`, updates state even if length is 0.
  - `fetchAdminCategories`: Fetches from `GET /api/v1/admin/categories`.
  - `fetchAdminBrands`: Fetches from `GET /api/v1/admin/brands`.
  - `fetchAdminCollections`: Fetches from `GET /api/v1/admin/collections`.
  - `fetchAdminIngredients`: Fetches from `GET /api/v1/ingredients`.
  - `fetchAdminCoupons`: Fetches from `GET /api/v1/admin/coupons`.
  - `fetchAdminReviews`: Fetches from `GET /api/v1/admin/reviews`.
  - `fetchAdminCustomers`: Fetches from `GET /api/v1/admin/customers`.
  - `fetchAdminEnquiries`: Fetches from `GET /api/v1/admin/enquiries`.
  - `fetchAdminSupportTickets`: Fetches from `GET /api/v1/admin/support-tickets`.
  - `fetchAdminSubscribers`: Fetches from `GET /api/v1/admin/subscribers`.
  - `fetchAdminUsers`: Fetches from `GET /api/v1/admin/users`.
  - `fetchAdminAuditLogs`: Fetches from `GET /api/v1/admin/audit-logs`.
  - `fetchAdminHomepage`: Fetches from `GET /api/v1/admin/homepage`.
  - `fetchAdminSettings`: Fetches from `GET /api/v1/admin/settings`.
- **Automatic Staff Sync**:
  - Triggers all admin fetch functions inside `useEffect` whenever a staff member is authenticated.
- **Clean Reset Storage Function**:
  - Refactored `resetDemoData()` to reset all local storage keys to `[]` and immediately re-sync with the backend database.
  - Exported all fetch functions in `AdminContext.Provider` value for admin page access.

#### `client/src/components/admin/layout/AdminSidebar.jsx`
- Updated reset button label from "Reset Demo Data" to "Sync with Database".
- Updated confirmation dialog and alert messaging to inform the administrator that local cache is cleared and state synchronized with MongoDB.

### C. Referral & Rewards System

#### `client/src/services/referralService.js`
- Removed imports of `DEMO_REFERRAL_CODES` and `INITIAL_REFERRAL_ACTIVITY`.
- `getCustomerReferralCode()`: Generates dynamic codes deterministically based on authenticated user ID; eliminated mock fallback code `DIVYAM8K2P`.
- `validateReferralCode()`: Validates format (`DIVYAM*` with length >= 6) and settings instead of matching against hardcoded demo dictionaries.
- `getAllReferralActivity()`: Defaults to empty array `[]`.
- `getReferralDashboard()`: Reset `totalShares` baseline from 18 to 0.

### D. Storefront Presentation Layer & Empty States

#### `client/src/components/home/ShopByCategory.jsx`
- Added graceful empty state rendering ("No botanical categories available yet.") when `categoriesList.length === 0`.

#### `client/src/components/home/BestsellersSection.jsx`
- Added empty state card ("No products found in this category yet.") when `displayedProducts.length === 0`.

#### `client/src/components/home/TrendingSection.jsx`
- Added empty state card ("No trending products available yet.") when `products.length === 0`.

#### `client/src/components/home/NewArrivalsSection.jsx`
- Added empty state card ("No new arrivals available yet.") when `products.length === 0`.

#### `client/src/components/home/FeaturedCollectionsSection.jsx`
- Added empty state card ("No featured collections available yet.") when `collectionsList.length === 0`.

### E. Backend Endpoints & Seed Safeguard

#### `server/src/controllers/admin.controller.js`
- Added `listCustomers` controller:
  ```javascript
  export const listCustomers = asyncHandler(async (req, res) => {
    const customers = await User.find({ isStaff: false }).select("-passwordHash").sort({ createdAt: -1 });
    return sendSuccess(res, customers);
  });
  ```

#### `server/src/routes/v1/admin.routes.js`
- Added `GET /api/v1/admin/customers` protected by `requirePermission(PERMISSIONS.CUSTOMERS_VIEW)`.

#### `server/scripts/seed.js`
- Added execution safeguard at script entry:
  ```javascript
  if (process.env.ALLOW_DEMO_SEED !== "true" && !process.argv.includes("--force")) {
    logger.warn("Seeding is disabled to protect clean database state. Run with ALLOW_DEMO_SEED=true or --force if you deliberately want to re-populate demo records.");
    process.exit(0);
  }
  ```

### F. Automated Integration Test Self-Containment

#### `server/tests/integration/catalog.test.js`
- Added `beforeAll` and `afterAll` hooks to create and cleanly delete minimal test categories and products (`ProductVariant`, `Product`, `Category`).
- Tests now execute and pass independently of initial database state.

#### `server/tests/integration/checkout.test.js`
- Added dynamic fixture generation in `beforeAll` for parent product, test variant, concurrency test variant, and `WELCOME10` coupon.
- Added comprehensive `afterAll` teardown cleaning variants, products, orders, coupons, quotes, inventory movements, and idempotency keys.

#### `server/tests/integration/webhooks.test.js`
- Added fallback product generation in `beforeAll` if none exists.
- Added `afterAll` teardown cleaning test shipments, orders, payments, variants, test products, webhook events, and inventory movements.

#### `server/tests/integration/rbac.test.js`
- Added dynamic non-staff customer creation in `beforeAll` when database is clean.
- Added `afterAll` teardown deleting created customer and temporary staff accounts.

#### `server/tests/integration/auth.test.js`
- Added `afterAll` teardown deleting the newly registered test customer account.

---

## 4. Verification & Status Proof

1. **Test Suite Status**:
   - Command: `npm test` in `server`
   - Result: **5 passed (5 test files), 29 passed (29 tests), 0 failures**.
2. **Build Status**:
   - Command: `npm run build` in `client`
   - Result: **Successful production build in 3.24s (0 errors)**.
3. **Database Integrity**:
   - Verified that `users` contains strictly 1 document (`admin@divyamayurveda.demo`).
   - Verified that all business entity collections (`products`, `orders`, `categories`, `brands`, etc.) remain at **0**.

