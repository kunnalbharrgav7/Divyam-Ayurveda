# DIVYAM AYURVEDA — STATIC BUSINESS DATA & DATABASE AUDIT INVENTORY

> **Target:** Complete audit of all static business data, mock records, demo fallbacks, and database entities across Client, Server, and MongoDB.  
> **Date:** October 18, 2026  
> **Status:** AUDITED & MAPPED  

---

## 1. Executive Overview

This audit identifies every occurrence of static business data, demo arrays, fallback states, and pre-seeded database records in the **Divyam Ayurveda** application. The objective is to transition the application to a completely clean state:
1. **Database:** Exactly **one authorized administrator account** (`admin@divyamayurveda.demo`) and **zero customer accounts** or business data records (products, variants, inventory movements, categories, brands, collections, orders, payments, shipments, coupons, ingredients, reviews, faqs, blogs, testimonials).
2. **Frontend:** Zero hardcoded business data fallbacks. When the database is empty, the frontend displays truthful empty states without falling back to static arrays.
3. **Backend:** Clean API operations returning authoritative MongoDB results without synthetic fixtures in production paths.

---

## 2. Exhaustive Static Business Data Matrix

| File Path | Data Type | Current Source | Usage | Classification | Action | Verification |
|---|---|---|---|---|---|---|
| `client/src/data/products.js` | 24 Ayurvedic Products | Static JavaScript array | `api.js` (fallback in `getLiveProducts`), `AdminContext.jsx` (`seedProducts`) | **Remove from Production Paths** | Remove fallback usage in `api.js` and `AdminContext.jsx`. Return empty array when database is empty. | Verify empty catalog renders graceful empty state without errors. |
| `client/src/data/categories.js` | 8 Categories with Subcategories | Static JavaScript array | `api.js` (fallback in `getLiveCategories`), `AdminContext.jsx` (`seedCategories`) | **Remove from Production Paths** | Remove fallback in `api.js` and `AdminContext.jsx`. Return `[]` when MongoDB collection is empty. | Verify category lists and navigation render empty state or handle 0 categories. |
| `client/src/data/collections.js` | 4 Editorial Collections | Static JavaScript array | `api.js` (`getLiveCollections`), `AdminContext.jsx` (`seedCollections`) | **Remove from Production Paths** | Remove fallback in `api.js` and `AdminContext.jsx`. Return `[]` when collection count is 0. | Verify home collections section handles 0 items gracefully. |
| `client/src/data/brands.js` | 4 Manufacturing Brands | Static JavaScript array | `AdminContext.jsx` (`initialBrands`) | **Remove from Production Paths** | Initialize `brands` state to `[]` in `AdminContext.jsx`. Read exclusively from `GET /api/v1/admin/brands`. | Verify admin brands table shows empty state. |
| `client/src/data/customers.js` | 10 Demo Customers | Static JavaScript array | `AdminContext.jsx` (`initialCustomers`) | **Remove from Production Paths** | Initialize `customers` state to `[]` in `AdminContext.jsx`. Sync with `GET /api/v1/admin/users`. | Verify admin customers table shows 0 customers. |
| `client/src/data/coupons.js` | 6 Promotional Coupons | Static JavaScript array | `AdminContext.jsx` (`initialCoupons`) | **Remove from Production Paths** | Initialize `coupons` state to `[]`. Read exclusively from `GET /api/v1/admin/coupons`. | Verify admin coupons table shows 0 coupons. |
| `client/src/data/reviews.js` | 12 Demo Reviews | Static JavaScript array | `AdminContext.jsx` (`initialReviews`) | **Remove from Production Paths** | Initialize `reviews` state to `[]`. Read exclusively from `GET /api/v1/admin/reviews`. | Verify reviews moderation shows 0 reviews. |
| `client/src/data/ingredients.js` | 10 Botanical Herbs | Static JavaScript array | `api.js` (`getLiveIngredients`), `AdminContext.jsx` (`seedIngredients`) | **Remove from Production Paths** | Remove fallback in `api.js` and `AdminContext.jsx`. Read exclusively from `GET /api/v1/ingredients`. | Verify botanical directory shows 0 herbs with clean empty state. |
| `client/src/data/faqs.js` | 18 Static FAQ items | Static JavaScript array | `api.js` (`defaultFaqs`) | **Remove from Production Paths** | Remove fallback in `api.js`. Read exclusively from `GET /api/v1/faqs`. | Verify FAQ page displays clean empty state when no FAQs in database. |
| `client/src/data/blogPosts.js` | 6 Wellness Blog Articles | Static JavaScript array | `api.js` (`defaultBlogPosts`), `AdminContext.jsx` (`seedBlogPosts`) | **Remove from Production Paths** | Remove fallback in `api.js` and `AdminContext.jsx`. Read from `GET /api/v1/blog`. | Verify blog page shows 0 articles empty state. |
| `client/src/data/testimonials.js` | 12 Testimonials | Static JavaScript array | `api.js` (`defaultTestimonials`) | **Remove from Production Paths** | Remove fallback in `api.js`. Read from `GET /api/v1/testimonials`. | Verify customer reviews page displays empty state. |
| `client/src/data/supportTickets.js` | 5 Support Tickets, 4 Enquiries, 4 Subscribers | Static JavaScript array | `AdminContext.jsx` (`initialSupportTickets`, `initialSubscribers`) | **Remove from Production Paths** | Initialize `supportTickets`, `contactEnquiries`, `subscribers` state to `[]` in `AdminContext.jsx`. | Verify admin support tables show 0 records. |
| `client/src/data/referralMockData.js` | Demo Referral Codes & Activity | Static JavaScript array | `referralService.js` | **Remove from Production Paths** | Remove demo customer code mapping and simulated activity array from `referralService.js`. Read from real backend `/api/v1/referrals/*`. | Verify referral dashboard loads empty activity when user has 0 referrals. |
| `client/src/data/adminUsers.js` | Role & Permission Definitions | Static JavaScript array | `AdminContext.jsx` | **Preserve Legitimate Config** | Retain `ROLE_DEFINITIONS` and `PERMISSIONS_LIST` as UI metadata and permission labels. | Ensure admin user creation modal can map role permissions. |
| `client/src/data/storeSettings.js` | Default Store Configuration | Static JavaScript object | `AdminContext.jsx` (`initialStoreSettings`) | **Preserve Default Config** | Retain default store schema structure; values override from database `GET /api/v1/admin/settings`. | Verify store settings page loads saved MongoDB settings. |
| `client/src/services/api.js` | Fallback Logic & Mock Storage | JavaScript Service | All frontend customer pages | **Remove Fallback Logic** | Modify `api.js` to return actual empty results (`[]`) when backend returns `data: []` instead of falling back to static arrays. | Test each API method with empty database. |
| `client/src/context/AdminContext.jsx` | Initial Seed Orders & Storage Fallbacks | React Context Provider | All admin pages and dashboard widgets | **Remove Initial Seed Data** | Remove `INITIAL_SEED_ORDERS`. Default all entity states to `[]`. Compute KPIs truthfully from real data (0 revenue, 0 orders, etc.). | Verify admin dashboard metrics display `₹0` revenue and `0` orders. |
| `server/scripts/seed.js` | Complete Database Demo Seeder | Node.js Script | Manual command `npm run seed` | **Isolate with Safety Guard** | Add safety confirmation guard (`ALLOW_DEMO_SEED=true` or `--force`) to prevent accidental repopulation of clean database. | Verify running `npm run seed` without flag safely aborts with warning. |
| `server/scripts/create-admin.js` | Super Admin Provisioning Script | Node.js Script | Manual command `npm run create-admin` | **Preserve Admin Provisioning** | Retain script for idempotent provisioning of single Super Admin (`admin@divyamayurveda.demo`). | Verify script runs cleanly without touching business data. |
| `server/src/integrations/cashfree/cashfree.mock.js` | Mock Payment Adapter | JavaScript Mock Class | `cashfree.adapter.js` | **Preserve as Test Fixture** | Gated by `NODE_ENV !== 'production'`. Used strictly in test suite (`npm test`). | Verify unit tests pass and production mode throws error. |
| `server/src/integrations/shiprocket/shiprocket.mock.js` | Mock Courier Adapter | JavaScript Mock Class | `shiprocket.adapter.js` | **Preserve as Test Fixture** | Gated by `NODE_ENV !== 'production'`. Used strictly in test suite (`npm test`). | Verify unit tests pass and production mode throws error. |

---

## 3. Database Collections Pre-Cleanup Status

Connected Database: **`divyam_ayurveda`**  
Host: **`127.0.0.1:27017`** (Local Development Environment)  

| Collection | Pre-Cleanup Count | Target Post-Cleanup | Status & Strategy |
|---|---:|---:|---|
| `users` | 21 | **1** | Retain single Super Admin `admin@divyamayurveda.demo`; delete all 20 customer/test accounts. |
| `products` | 24 | **0** | Delete all demo products. |
| `productvariants` | 51 | **0** | Delete all demo product variants. |
| `inventorymovements` | 363 | **0** | Delete all demo inventory movement history. |
| `categories` | 8 | **0** | Delete all demo categories. |
| `brands` | 4 | **0** | Delete all demo brands. |
| `collections` | 4 | **0** | Delete all demo collections. |
| `orders` | 34 | **0** | Delete all demo/test orders. |
| `payments` | 13 | **0** | Delete all demo/test payments. |
| `shipments` | 13 | **0** | Delete all demo/test shipments. |
| `coupons` | 5 | **0** | Delete all demo coupons. |
| `ingredients` | 11 | **0** | Delete all demo botanical herbs. |
| `testimonials` | 12 | **0** | Delete all demo testimonials. |
| `faqs` | 8 | **0** | Delete all demo FAQs. |
| `blogposts` | 3 | **0** | Delete all demo blog posts. |
| `reviews` | 0 | **0** | Retain empty collection. |
| `carts` | 0 | **0** | Retain empty collection. |
| `quotes` | 0 | **0** | Retain empty collection. |
| `refunds` | 0 | **0** | Retain empty collection. |
| `referrals` | 0 | **0** | Retain empty collection. |
| `subscribers` | 0 | **0** | Retain empty collection. |
| `supporttickets` | 0 | **0** | Retain empty collection. |
| `contactenquiries` | 0 | **0** | Retain empty collection. |
| `returnrequests` | 0 | **0** | Retain empty collection. |
| `idempotencykeys` | 7 | **0** | Clear stale test idempotency records. |
| `webhookevents` | 26 | **0** | Clear stale test webhook logs. |
| `auditlogs` | 13 | **0** | Clear stale test audit history. |
| `roles` | 7 | **7** | **PRESERVE SYSTEM ROLES** (`Super Admin`, `Admin`, etc.). |
| `storesettings` | 1 | **1** | **PRESERVE SYSTEM STORE CONFIG**. |
| `homepageconfigs` | 1 | **1** | **PRESERVE SYSTEM HOMEPAGE CONFIG**. |
| `referralprograms` | 1 | **1** | **PRESERVE SYSTEM REFERRAL PROGRAM CONFIG**. |

---

## 4. Protected Administrator Identity

- **ID:** `6ad3468884d5491fed184f46`
- **Email:** `admin@divyamayurveda.demo`
- **Name:** Divyam Store Administrator
- **Phone:** `+919876500001`
- **Role:** Super Admin (`6ad3468884d5491fed184f3f` - has all 20 system permissions)
- **Status:** `active`
- **isStaff:** `true`
- **Password Hash:** Preserved intact with bcrypt salt/rounds. Validated via `/api/v1/auth/login`.

