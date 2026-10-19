# DIVYAM AYURVEDA — MOCK DATA DISCOVERY, SAFE REMOVAL & REAL DATABASE MIGRATION REPORT

> **Project:** Divyam Ayurveda Full-Stack Platform  
> **Date:** October 18, 2026  
> **Auditor & Integration Engineer:** Senior MERN Architect & QA Specialist  
> **Audit Status:** COMPLETED & VERIFIED  

---

## 1. Executive Summary

This report documents the discovery, categorization, safe replacement, database migration, and verification of all mock, static, and simulated data throughout the **Divyam Ayurveda** repository.

Previously, the frontend UI components relied on hardcoded JavaScript arrays, demo customer/order records, simulated referral mechanisms, and local storage state. Following our architectural roadmap, all customer-facing and administrative pages now fetch dynamic data from real versioned REST endpoints (`/api/v1/*`), backed by a persistent MongoDB database (`divyam_ayurveda`), while retaining resilient offline fallbacks and automated test fixtures where appropriate.

---

## 2. Discovery Findings & Classification Breakdown

An exhaustive scan across `client/src`, `server/src`, and `server/scripts` identified **19 distinct data sources**, cataloged in [`server/docs/MOCK_DATA_INVENTORY.md`](file:///d:/Divyam%20Ayurveda/server/docs/MOCK_DATA_INVENTORY.md).

### Classification Breakdown

| Category | Description | Count | Action Taken |
| :--- | :--- | :---: | :--- |
| **Category 1 — Production Mock Data** | Hardcoded arrays in production UI | 10 | Replaced with live asynchronous service calls to MongoDB endpoints |
| **Category 2 — Development Demo Data** | Offline fallbacks & mock adapters | 4 | Isolated behind runtime flags & production safeguards |
| **Category 3 — Database Seed Data** | Idempotent database port scripts | 3 | Verified idempotent upsert operations (`findOneAndUpdate`, `upsert: true`) |
| **Category 4 — Automated Test Fixtures** | Repeatable test mocks in CI/CD | 3 | Retained in `server/tests/` and in-memory mock adapters |
| **Category 5 — Legitimate Static Configuration** | True constants (Roles, Permissions) | 2 | Retained as static UI/domain configuration constants |
| **Category 6 — Temporary / Dead Data** | Obsolete or orphan files | 0 | No dangling dependencies found |

---

## 3. Detailed List of Replacements & Migrations

### 3.1 Storefront Catalog & Content Components

1. **`FeaturedCollectionsSection.jsx` (`client/src/components/home/`)**:
   - *Previous:* Direct import of static `collections` array from `../../data/collections`.
   - *Now:* Dynamically fetches via `collectionService.getCollections()` (`GET /api/v1/collections`) with a 4-card animated skeleton loader during resolution.

2. **`ShopByCategory.jsx` (`client/src/components/home/`)**:
   - *Previous:* Direct import of static `categories` array from `../../data/categories`.
   - *Now:* Dynamically fetches via `categoryService.getCategories()` (`GET /api/v1/categories`) with 8 circular skeleton placeholders and framer-motion stagger animations.

3. **`CategoryNav.jsx` (`client/src/components/layout/`)**:
   - *Previous:* Static category navigation in desktop mega-dropdown and mobile navigation drawers.
   - *Now:* Dynamically populated via `categoryService.getCategories()`.

4. **`CatalogPage.jsx` (`client/src/pages/`)**:
   - *Previous:* Static categories in sidebar and mobile filter drawers.
   - *Now:* Dynamically driven by `categoryService.getCategories()` to reflect active categories in MongoDB.

5. **`OffersPage.jsx` (`client/src/pages/`)**:
   - *Previous:* Static import of `products` array with client-side discount filtering.
   - *Now:* Queries `productService.getProducts({ limit: 50 })`, dynamically computes discounts where `originalPrice > price`, and displays pulse skeleton loaders.

6. **`FaqPage.jsx` (`client/src/pages/`)**:
   - *Previous:* Static `faqs` and `faqCategories` from `../data/faqs`.
   - *Now:* Fetches live questions via `contentService.getFaqs()` (`GET /api/v1/faqs`).

7. **`IngredientsPage.jsx` (`client/src/pages/`)**:
   - *Previous:* Hardcoded array of 10 herbs from `../data/ingredients`.
   - *Now:* Fetches from `contentService.getIngredients()` (`GET /api/v1/ingredients`) with real botanical attributes and dosha balances.

8. **`BlogListPage.jsx` (`client/src/pages/`)**:
   - *Previous:* Initialized with static `blogPosts` array.
   - *Now:* Fetches live articles via `contentService.getBlogPosts()` (`GET /api/v1/blog`) with category filters and fallback card thumbnails.

9. **`CustomerReviewsPage.jsx` (`client/src/pages/`)**:
   - *Previous:* Initialized with static `testimonials` array.
   - *Now:* Fetches verified customer reviews via `contentService.getTestimonials()` (`GET /api/v1/testimonials`).

---

### 3.2 Botanical Herb Administration

10. **`IngredientsAdminPage.jsx` (`client/src/pages/admin/`)**:
    - *Previous:* Bound strictly to `localStorage` and `seedIngredients`.
    - *Now:* Integrated with `useAdmin()` context, connecting directly to:
      - `GET /api/v1/ingredients` & `GET /api/v1/admin/ingredients`
      - `POST /api/v1/admin/ingredients` (Create new herb profile)
      - `PATCH /api/v1/admin/ingredients/:id` (Update botanical details)
      - `DELETE /api/v1/admin/ingredients/:id` (Archive botanical herb)
    - Automatically updates local state and synchronizes persistence with the MongoDB backend.

---

### 3.3 Customer Referral & Rewards Architecture

11. **`referralService.js` & `ReferralContext.jsx` (`client/src/`)**:
    - *Previous:* Pure client-side simulation using `referralMockData.js` and `localStorage`.
    - *Now:* Fully connected to the backend referral API:
      - `validateReferralCodeAsync(code, subtotal, refereeEmail)` → `POST /api/v1/referrals/validate`
      - `recordReferralAttribution(code, refereeEmail, refereeName)` → `POST /api/v1/referrals/attribute`
      - `getReferralDashboardAsync(user)` → `GET /api/v1/referrals/me`
    - Maintains offline fallbacks to prevent user disruption if disconnected.

---

## 4. Database Seed Strategy & Migration Audit

### 4.1 Schema Parity Fix
During the database audit, we discovered that `server/src/models/Ingredient.js` was missing four properties present in the frontend and seed data: `doshaBalance`, `partUsed`, `traditionalUses`, and `featuredInProducts`. Furthermore, `server/scripts/seed.js` previously upserted ingredients by `{ slug: ing.slug }` without slug generation, which had collapsed seed data into a single document with `{ slug: null }`.

**Actions Executed:**
1. Updated `server/src/models/Ingredient.js` to define:
   - `doshaBalance: { type: String, default: "" }`
   - `partUsed: { type: String, default: "" }`
   - `traditionalUses: { type: String, default: "" }`
   - `featuredInProducts: { type: [String], default: [] }`
2. Updated `server/scripts/seed.js` to compute standard URL slugs (`const slug = ing.slug || ing.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")...`) and populate complete botanical metadata.
3. Executed `node scripts/seed.js` in `server/`. Verified that all 11 botanical ingredients are now stored and indexed in MongoDB (`divyam_ayurveda.ingredients`).

### 4.2 Seed Idempotency & Production Protection
- Every model in `server/scripts/seed.js` uses `findOneAndUpdate` with `{ upsert: true }`, preventing duplicate records on repeated executions.
- `server/scripts/seed.js` contains a safeguard preventing destructive operations in production environments.

---

## 5. Production Mock Safeguards

In accordance with Step 9, fatal runtime safeguards were implemented in all mock integration adapters to ensure test/demo adapters can never execute under production mode:

1. **Cashfree Payment Gateway (`server/src/integrations/cashfree/cashfree.adapter.js`)**:
   ```javascript
   this.isMock = config.NODE_ENV === "test" || !this.appId || this.appId === "TEST_CF_APP_ID";
   if (config.NODE_ENV === "production" && this.isMock) {
     throw new Error(
       "Cannot run Cashfree mock payment adapter in production environment. Valid CASHFREE_APP_ID and CASHFREE_SECRET_KEY required."
     );
   }
   ```

2. **Shiprocket Courier Tracking (`server/src/integrations/shiprocket/shiprocket.adapter.js`)**:
   ```javascript
   this.isMock =
     config.NODE_ENV === "test" ||
     !this.email ||
     this.email.includes(".test") ||
     this.email === "shipping@divyamayurveda.test";

   if (config.NODE_ENV === "production" && this.isMock) {
     throw new Error(
       "Cannot run Shiprocket mock courier adapter in production environment. Valid SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD required."
     );
   }
   ```

3. **Frontend API Layer (`client/src/services/api.js`)**:
   Logs descriptive warnings when local fallback data is utilized, ensuring developers are alerted when backend connectivity is degraded.

---

## 6. Verification and Test Results

### 6.1 Server Automated Integration Test Suite (`npm test`)
Ran Vitest integration test suite against running MongoDB:
```
 ✓ tests/integration/auth.test.js (7 tests)
 ✓ tests/integration/webhooks.test.js (7 tests)
 ✓ tests/integration/rbac.test.js (5 tests)
 ✓ tests/integration/checkout.test.js (3 tests)
 ✓ tests/integration/catalog.test.js (7 tests)

 Test Files  5 passed (5)
      Tests  29 passed (29)
   Duration  8.64s
```
**Outcome:** 100% passing tests (29/29), validating JWT authentication, HMAC webhook validation, idempotency, RBAC permissions, and stock reservation.

### 6.2 Client Production Build (`npm run build`)
Executed Vite/Rolldown production build:
```
vite v8.3.4 building client environment for production...
✓ 2460 modules transformed.
dist/index.html                     1.02 kB │ gzip:   0.56 kB
dist/assets/index-C88etbnf.css    109.20 kB │ gzip:  16.74 kB
dist/assets/index-CvfsG46E.js   1,338.36 kB │ gzip: 355.24 kB
✓ built in 4.23s
```
**Outcome:** Build passed with 0 errors.

---

## 7. Retained Legitimate Static Configuration

The following files were intentionally retained as legitimate static configuration (Category 5) or development fixtures (Category 4):

1. `client/src/data/adminUsers.js`: Retained `ROLE_DEFINITIONS` and `PERMISSIONS_LIST` as client-side UI configuration for role description cards and icon mappings.
2. `server/src/constants/permissions.js`: Authoritative backend permission constants.
3. `server/src/integrations/cashfree/cashfree.mock.js` & `shiprocket.mock.js`: Retained for unit testing and local sandboxes, protected by production runtime safeguards.
4. `ioredis-mock`: Retained in `server/src/config/redis.js` as an in-memory fallback when Redis is absent in local development.

---

## 8. Summary of Modified Files

- `server/src/models/Ingredient.js`
- `server/src/controllers/admin.controller.js`
- `server/src/routes/v1/admin.routes.js`
- `server/scripts/seed.js`
- `server/src/integrations/cashfree/cashfree.adapter.js`
- `server/src/integrations/shiprocket/shiprocket.adapter.js`
- `server/docs/MOCK_DATA_INVENTORY.md`
- `server/docs/MOCK_DATA_CLEANUP_REPORT.md`
- `client/src/services/api.js`
- `client/src/services/referralService.js`
- `client/src/context/ReferralContext.jsx`
- `client/src/context/AdminContext.jsx`
- `client/src/pages/admin/IngredientsAdminPage.jsx`
- `client/src/pages/BlogListPage.jsx`
- `client/src/pages/IngredientsPage.jsx`
- `client/src/components/home/ShopByCategory.jsx`
- `client/src/components/home/FeaturedCollectionsSection.jsx`
- `client/src/components/layout/CategoryNav.jsx`
- `client/src/pages/CatalogPage.jsx`
- `client/src/pages/OffersPage.jsx`
- `client/src/pages/FaqPage.jsx`
- `client/src/pages/CustomerReviewsPage.jsx`

