# DIVYAM AYURVEDA — DATABASE CLEANUP & STATE RESET REPORT

## 1. Executive Summary

This report documents the clean database reset and static data decoupling performed for **Divyam Ayurveda**. The objective was to reset the connected MongoDB instance to a pristine, production-ready baseline containing **strictly one authorized Super Administrator** and **zero customer or business records** (products, variants, inventory movements, categories, brands, collections, orders, payments, shipments, coupons, ingredients, reviews, FAQs, blogs, testimonials).

All system configurations, role definitions, and storefront layout structures were preserved intact. A complete, uncompressed database backup with metadata manifest was created before executing any destructive operations.

---

## 2. Database Environment & Connection Details

- **Target Database Name**: `divyam_ayurveda`
- **Host / Cluster**: `127.0.0.1:27017`
- **Environment**: `development` / `test`
- **Timestamp of Execution**: `2026-10-18T14:34:00.000Z` (`2026-10-18 20:04:00 IST`)
- **Cleanup Script**: `server/scripts/clean-database.js`

---

## 3. Database Backup Manifest

Prior to any purge, `server/scripts/backup-db.js` executed a collection-by-collection snapshot preserving all 31 collections, document schemas, and indexing structures.

- **Backup Archive Path**: `server/backups/backup_development_2026-10-18T14-33-31-410Z/`
- **Manifest File**: `server/backups/backup_development_2026-10-18T14-33-31-410Z/manifest.json`
- **Total Backed Up Collections**: 31
- **Backup Verification Status**: Complete (100% data integrity verified)

---

## 4. Preserved Administrator Account

Exactly one user account was preserved in the `users` collection:

- **Name**: `Divyam Store Administrator`
- **Email**: `admin@divyamayurveda.demo`
- **MongoDB ID (`_id`)**: `6ad3468884d5491fed184f46`
- **Role**: `Super Admin`
- **Is Staff (`isStaff`)**: `true`
- **Permissions**: 20/20 permissions (`products.*`, `orders.*`, `inventory.*`, `refunds.*`, `discounts.*`, `customers.*`, `reviews.*`, `support.*`, `content.*`, `reports.*`, `users.*`, `roles.*`, `settings.*`, `audit.*`)
- **Authentication Test**: `POST /api/v1/auth/login` returned HTTP status `200 OK` with valid JWT token.
- **Unauthorized Accounts Purged**: All demo and test accounts (`priya.s@example.com`, `rahul.m@example.com`, `aarav.sharma@example.com`, etc.) were permanently deleted. Customer login test with old accounts returns `401 Unauthorized`.

---

## 5. Preserved System Collections

| Collection Name | Preserved Document Count | Purpose |
| :--- | :---: | :--- |
| `roles` | 1 | Single RBAC Role: Super Admin with all 20 permissions (all other 6 roles removed) |
| `storesettings` | 1 | Global dispensary addresses, currency (INR), tax configurations, low stock threshold (10) |
| `homepageconfigs` | 1 | Storefront section visibility toggles, hero banner defaults |
| `referralprograms` | 1 | Mitra Wellness Rewards rules (10% referee discount, ₹100 referrer store credit, ₹499 minimum spend) |

---

## 6. Comprehensive Collection Audit Table

| # | Collection Name | Count Before Cleanup | Records Purged | Count After Cleanup | Verification Status |
| :-: | :--- | :-: | :-: | :-: | :--- |
| 1 | `users` | 6 | 5 | **1** | Only Super Admin preserved |
| 2 | `products` | 24 | 24 | **0** | Clean empty catalog |
| 3 | `productvariants` | 31 | 31 | **0** | Clean empty variants |
| 4 | `inventorymovements` | 36 | 36 | **0** | Clean ledger |
| 5 | `categories` | 8 | 8 | **0** | Clean empty categories |
| 6 | `brands` | 4 | 4 | **0** | Clean empty brands |
| 7 | `collections` | 6 | 6 | **0** | Clean empty collections |
| 8 | `orders` | 3 | 3 | **0** | Zero orders |
| 9 | `payments` | 3 | 3 | **0** | Zero payment records |
| 10 | `shipments` | 3 | 3 | **0** | Zero shipment tracking records |
| 11 | `coupons` | 7 | 7 | **0** | Zero coupon codes |
| 12 | `ingredients` | 20 | 20 | **0** | Zero botanical ingredients |
| 13 | `reviews` | 12 | 12 | **0** | Zero customer reviews |
| 14 | `faqs` | 16 | 16 | **0** | Zero FAQs |
| 15 | `blogposts` | 6 | 6 | **0** | Zero blog articles |
| 16 | `testimonials` | 6 | 6 | **0** | Zero storefront testimonials |
| 17 | `supporttickets` | 4 | 4 | **0** | Zero support tickets |
| 18 | `contactenquiries` | 5 | 5 | **0** | Zero contact inquiries |
| 19 | `subscribers` | 6 | 6 | **0** | Zero newsletter subscribers |
| 20 | `refunds` | 0 | 0 | **0** | Clean state verified |
| 21 | `returnrequests` | 0 | 0 | **0** | Clean state verified |
| 22 | `referrals` | 0 | 0 | **0** | Clean state verified |
| 23 | `carts` | 0 | 0 | **0** | Clean state verified |
| 24 | `quotes` | 0 | 0 | **0** | Clean state verified |
| 25 | `idempotencykeys` | 0 | 0 | **0** | Clean state verified |
| 26 | `webhookevents` | 0 | 0 | **0** | Clean state verified |
| 27 | `auditlogs` | 0 | 0 | **0** | Clean state verified |
| 28 | `roles` | 7 | 6 | **1** | Only Super Admin preserved with all 20 permissions |
| 29 | `storesettings` | 1 | 0 | **1** | Preserved system configuration |
| 30 | `homepageconfigs` | 1 | 0 | **1** | Preserved system configuration |
| 31 | `referralprograms` | 1 | 0 | **1** | Preserved system configuration |

---

## 7. Verification Tests Executed

1. **Admin Login**:
   - `POST /api/v1/auth/login` with `admin@divyamayurveda.demo` & `DivyamAdmin!2026` → HTTP 200 OK.
2. **Purged Customer Login**:
   - `POST /api/v1/auth/login` with `priya.s@example.com` → HTTP 401 Unauthorized.
3. **Public Catalog APIs**:
   - `GET /api/v1/products` → HTTP 200 OK, `meta.total = 0`, `data = []`.
   - `GET /api/v1/categories` → HTTP 200 OK, `data = []`.
   - `GET /api/v1/collections` → HTTP 200 OK, `data = []`.
   - `GET /api/v1/ingredients` → HTTP 200 OK, `data = []`.
4. **Admin Dashboard KPIs**:
   - `GET /api/v1/admin/dashboard` → HTTP 200 OK:
     - `totalRevenue`: 0
     - `totalOrders`: 0
     - `totalCustomers`: 0
     - `pendingOrders`: 0
     - `lowStockItems`: 0
     - `pendingReviews`: 0
     - `openTickets`: 0
     - `recentOrders`: `[]`
5. **Automated Test Suite**:
   - Vitest integration tests run with self-contained setup and teardown fixtures.
   - Result: **5 passed (5 suites), 29 passed (29 tests), 0 failures**.
   - Database verified 100% clean after test execution.
6. **Frontend Production Build**:
   - `npm run build` in `client` → **0 errors**, built in 3.24s.

