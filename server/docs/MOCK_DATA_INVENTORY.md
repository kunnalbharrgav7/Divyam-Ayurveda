# DIVYAM AYURVEDA — MOCK & STATIC DATA DISCOVERY AND CLASSIFICATION INVENTORY

> **Target:** Exhaustive audit of all mock arrays, static seeds, simulation services, test fixtures, and static configurations across Client, Server, and Database.  
> **Date:** October 18, 2026  
> **Status:** AUDITED & CLASSIFIED  

---

## 1. Classification Categories & Criteria

Every occurrence of non-runtime data in the repository has been audited and classified into one of six standard architectural categories:

1. **Category 1 — Production Mock Data:** Static datasets or simulation services currently imported into customer or administrator production UI flows that must be replaced by real asynchronous API calls backed by MongoDB.
2. **Category 2 — Development Demo Data:** Fallback datasets or sample profiles intended exclusively for offline / local sandbox operation that must be gated and strictly disabled in production.
3. **Category 3 — Database Seed Data:** Idempotent database initialization scripts used to populate an empty MongoDB database in development/staging environments (`server/scripts/seed.js`).
4. **Category 4 — Automated Test Fixtures:** Isolated in-memory mocks and deterministic test payloads in `server/tests/` required for repeatable CI/CD test runs.
5. **Category 5 — Legitimate Static Configuration:** True application constants (e.g. state lists, dosha types, permission names, route definitions, UI layout configurations) that do not belong in a database.
6. **Category 6 — Temporary or Unused Data:** Abandoned or redundant files that have no active callers and can be safely eliminated.

---

## 2. Comprehensive Repository Inventory Matrix

| # | File Path | Data Type / Structure | Imported In / Consumers | Classification | Equivalent MongoDB Data Exists? | Real Target API Endpoint | Action Required |
| :-: | :--- | :--- | :--- | :---: | :---: | :--- | :--- |
| **1** | `client/src/data/products.js` | 24 Ayurvedic product objects | `OffersPage.jsx`, `api.js`, `AdminContext.jsx` | **Cat 1 / Cat 2** | Yes (`products`, `productvariants` col) | `GET /api/v1/products` | Replace production UI imports with `productService.getProducts()`; retain as offline fallback. |
| **2** | `client/src/data/categories.js` | 8 Category objects with subcategories | `ShopByCategory.jsx`, `CategoryNav.jsx`, `CatalogPage.jsx`, `api.js` | **Cat 1 / Cat 2** | Yes (`categories` col: 8 docs) | `GET /api/v1/categories` | Replace direct UI imports with `categoryService.getCategories()`. |
| **3** | `client/src/data/collections.js` | 4 Curated collection objects | `FeaturedCollectionsSection.jsx`, `api.js` | **Cat 1 / Cat 2** | Yes (`collections` col: 4 docs) | `GET /api/v1/collections` | Replace direct import with `collectionService.getCollections()`. |
| **4** | `client/src/data/testimonials.js` | 12 Verified customer reviews | `CustomerReviewsPage.jsx`, `TestimonialsSection.jsx`, `api.js` | **Cat 1 / Cat 2** | Yes (`testimonials` col: 12 docs) | `GET /api/v1/testimonials` | Replace direct UI imports with `contentService.getTestimonials()`. |
| **5** | `client/src/data/faqs.js` | 18 FAQ questions & categories | `FaqPage.jsx`, `api.js` | **Cat 1 / Cat 2** | Yes (`faqs` col: 18 docs) | `GET /api/v1/faqs` | Replace direct UI imports with `contentService.getFaqs()`. |
| **6** | `client/src/data/ingredients.js` | 24 Herb profiles | `IngredientsPage.jsx`, `IngredientsAdminPage.jsx`, `api.js` | **Cat 1 / Cat 2** | Yes (`ingredients` col: 24 docs) | `GET /api/v1/ingredients` | Replace direct UI imports with `contentService.getIngredients()`. |
| **7** | `client/src/data/blogPosts.js` | 6 Ayurvedic wellness articles | `BlogListPage.jsx`, `api.js` | **Cat 1 / Cat 2** | Yes (`blogposts` col: 6 docs) | `GET /api/v1/blog` | Replace initial state with `contentService.getBlogPosts()`. |
| **8** | `client/src/data/referralMockData.js` | Hardcoded referral codes & activities | `referralService.js`, `ReferralContext.jsx` | **Cat 1 / Cat 2** | Yes (`referralprograms` col) | `GET /api/v1/referrals/me`, `POST /validate` | Wire `referralService.js` to real backend referral API endpoints. |
| **9** | `client/src/data/brands.js` | 4 Manufacturing brand records | `AdminContext.jsx` | **Cat 2 / Cat 3** | Yes (`brands` col: 4 docs) | `GET /api/v1/admin/brands` | Retain as initial seed for local storage if empty; sync to API. |
| **10**| `client/src/data/coupons.js` | 6 Promotional coupon codes | `AdminContext.jsx` | **Cat 2 / Cat 3** | Yes (`coupons` col: 6 docs) | `GET /api/v1/admin/coupons` | Retain as seed for local storage; CRUD operations sync to backend. |
| **11**| `client/src/data/reviews.js` | 12 Product reviews | `AdminContext.jsx` | **Cat 2 / Cat 3** | Yes (`reviews` col: 12 docs) | `GET /api/v1/admin/reviews` | Retain as seed for local storage; moderation synced to backend. |
| **12**| `client/src/data/customers.js` | 10 Seed customer records | `AdminContext.jsx` | **Cat 2 / Cat 3** | Yes (`users` col: 18 docs) | `GET /api/v1/admin/users` | Retain for local development; admin dashboard reads from API. |
| **13**| `client/src/data/adminUsers.js` | Staff roles & permissions | `AdminUsersPage.jsx`, `RolesPage.jsx` | **Cat 5** | Yes (`roles` col: 5 docs) | `GET /api/v1/admin/roles` | **Retain as legitimate static configuration** (`ROLE_DEFINITIONS`, `PERMISSIONS_LIST`). |
| **14**| `client/src/data/storeSettings.js` | Default store metadata & policy | `AdminContext.jsx` | **Cat 2 / Cat 5** | Yes (`storesettings` col: 1 doc) | `GET /api/v1/admin/settings` | Retain default initial schema; edits sync to `PATCH /settings`. |
| **15**| `client/src/data/supportTickets.js` | Sample support & inquiry items | `AdminContext.jsx` | **Cat 2 / Cat 3** | Yes (`supporttickets`, `contactenquiries` col) | `GET /api/v1/admin/support-tickets` | Retain as local initial seed. |
| **16**| `server/scripts/seed.js` | Complete database port script | Administrative seed command (`npm run seed`) | **Cat 3** | Active database generator | N/A | **Retain as idempotent database initialization** (`upsert: true`). |
| **17**| `server/src/integrations/cashfree/cashfree.mock.js` | Simulated Cashfree PG responses | `cashfree.adapter.js` | **Cat 2 / Cat 4** | N/A (Gateway simulation) | Cashfree Sandbox / Live PG | Gated behind `NODE_ENV !== 'production'` safeguard. |
| **18**| `server/src/integrations/shiprocket/shiprocket.mock.js`| Simulated Shiprocket courier tracking | `shiprocket.adapter.js` | **Cat 2 / Cat 4** | N/A (Courier simulation) | Shiprocket API | Gated behind `NODE_ENV !== 'production'` safeguard. |
| **19**| `server/src/config/redis.js` | `ioredis-mock` in-memory fallback | Redis connection wrapper | **Cat 2 / Cat 4** | Redis / In-memory | N/A | Retain as resilient in-memory fallback when Redis service is offline. |

---

## 3. Detailed Component-by-Component Mapping & Replacement Plan

### 3.1 `FeaturedCollectionsSection.jsx`
- **Current:** Direct import of static `collections` array from `../../data/collections`.
- **Target:** Fetch from `collectionService.getCollections()`. Show smooth loading skeleton while loading; render real collections returned by MongoDB `GET /api/v1/collections`.

### 3.2 `ShopByCategory.jsx`
- **Current:** Direct import of static `categories` array from `../../data/categories`.
- **Target:** Fetch from `categoryService.getCategories()`. Render live categories returned by MongoDB `GET /api/v1/categories`.

### 3.3 `CategoryNav.jsx`
- **Current:** Direct import of static `categories` array from `../../data/categories`.
- **Target:** Dynamically load categories from `categoryService.getCategories()`.

### 3.4 `CatalogPage.jsx`
- **Current:** Direct import of static `categories` array for filter sidebar.
- **Target:** Fetch categories via `categoryService.getCategories()`.

### 3.5 `OffersPage.jsx`
- **Current:** Direct import of static `products` array and local filter (`p.originalPrice > p.price`).
- **Target:** Asynchronously fetch products via `productService.getProducts({ limit: 50 })`, filter products with active promotional pricing, and display live prices.

### 3.6 `FaqPage.jsx`
- **Current:** Direct import of static `faqs` and `faqCategories` from `../data/faqs`.
- **Target:** Fetch from `contentService.getFaqs()` backed by MongoDB `/api/v1/faqs`.

### 3.7 `IngredientsPage.jsx`
- **Current:** Direct import of static `ingredients` from `../data/ingredients`.
- **Target:** Fetch from `contentService.getIngredients()` backed by MongoDB `/api/v1/ingredients`.

### 3.8 `CustomerReviewsPage.jsx`
- **Current:** Initialized with static `testimonials` from `../data/testimonials`.
- **Target:** Asynchronously load testimonials via `contentService.getTestimonials()` backed by MongoDB `/api/v1/testimonials`.

### 3.9 `BlogListPage.jsx`
- **Current:** Initialized with static `defaultBlogPosts` from `../data/blogPosts`.
- **Target:** Initialize in loading state, fetch live articles from `contentService.getBlogPosts()` backed by MongoDB `/api/v1/blog`.

### 3.10 `referralService.js`
- **Current:** Pure client-side simulation using `referralMockData.js` and `localStorage`.
- **Target:** Wire `validateReferralCode` to `POST /api/v1/referrals/validate`, `recordReferralAttribution` to `POST /api/v1/referrals/attribute`, and `getReferralDashboard` to `GET /api/v1/referrals/me`.

---

## 4. Production Mock Data Safeguard Requirements

Under Step 9, we enforce:
1. `CashfreeAdapter`: Throws an immediate fatal configuration error if initialized without live or sandbox credentials under `NODE_ENV === "production"`.
2. `ShiprocketAdapter`: Throws an immediate fatal configuration error if initialized without valid Shiprocket credentials under `NODE_ENV === "production"`.
3. Client API Service: Logs explicit warning when running in development mode fallback and never permits silent substitution in production builds.

