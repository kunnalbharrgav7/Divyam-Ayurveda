# DIVYAM AYURVEDA — API INTEGRATION TEST EXECUTION REPORT

> **Framework:** Vitest 3.2.7 (Node.js Integration Suite)  
> **Environment:** In-Memory Test Isolation / Active MongoDB Database  
> **Date:** October 18, 2026  
> **Result:** ALL 29 TESTS PASSED ($100\%$ Success Rate)  

---

## 1. Test Suite Summary Table

| Test Suite File | Test Group / Feature | Tests | Passed | Failed | Duration |
| :--- | :--- | :---: | :---: | :---: | :---: |
| `tests/integration/auth.test.js` | Authentication, JWT tokens, Registration, Login, RBAC checks | 7 | 7 | 0 | 726 ms |
| `tests/integration/catalog.test.js` | Product catalog, Category filtering, Price sorting, Slugs, Search | 7 | 7 | 0 | 793 ms |
| `tests/integration/checkout.test.js`| Real-time quotes, Tax calculation, Order placement, Atomic stock reservation | 3 | 3 | 0 | 369 ms |
| `tests/integration/rbac.test.js` | Staff authentication, Permission validation, Idempotency enforcement | 5 | 5 | 0 | 397 ms |
| `tests/integration/webhooks.test.js`| Cashfree HMAC signature verification, Shiprocket status sync, Replay defense | 7 | 7 | 0 | 456 ms |
| **TOTAL** | **Full System Integration Verification** | **29** | **29** | **0** | **~14.3 s** |

---

## 2. Detailed Test Specifications & Assertions

### 2.1 Authentication & User Lifecycle (`auth.test.js`)
- `should register a new customer account with tokens`: Verifies hash generation, JWT creation (access + refresh), default customer role assignment, and HTTP 201 response.
- `should login with valid email and password`: Verifies bcrypt password comparison, access token delivery, and session cookie configuration.
- `should reject invalid credentials with HTTP 401`: Verifies non-existent emails and mismatched passwords return standardized error envelopes.
- `should refresh access tokens using valid refresh token`: Confirms token rotation and expiry enforcement.
- `should reject expired or forged refresh tokens`: Prevents unauthorized token renewal.
- `should retrieve authenticated user profile via /me`: Validates protected customer route guard.
- `should enforce password length and email validation`: Confirms Zod input validation schemas.

### 2.2 Catalog & Taxonomy Discovery (`catalog.test.js`)
- `should return public products list with pagination metadata`: Verifies `page`, `limit`, `total`, `totalPages`, `hasMore`.
- `should filter products by category slug`: Validates category-scoped querying.
- `should filter products by price range`: Verifies integer paise conversions ($₹200 - ₹400$).
- `should sort products by price ascending`: Verifies ascending sorting order.
- `should search products by text query`: Verifies multi-field regex text matching.
- `should fetch single product by unique slug`: Verifies variant attachment and review metrics.
- `should return active categories list`: Verifies taxonomy display order and active status filter.

### 2.3 Checkout & Atomic Inventory (`checkout.test.js`)
- `should generate accurate server-validated quote`: Calculates state-dependent GST (CGST/SGST vs IGST) and zone shipping fees.
- `should create order and deduct inventory atomically`: Verifies atomic decrements of `stockOnHand` and reservation mechanics.
- `should rollback stock when parallel orders exceed available inventory`: Verifies race-condition protection and concurrency rollback.

### 2.4 Staff RBAC & Governance (`rbac.test.js`)
- `should reject unauthenticated access to admin endpoints`: Returns HTTP 401 with standard error code.
- `should reject customer accounts accessing admin endpoints`: Returns HTTP 403 Forbidden.
- `should grant access to staff with proper permissions`: Verifies granular RBAC permissions (`ORDERS_VIEW`, `PRODUCTS_CREATE`).
- `should log audit events upon administrative updates`: Ensures immutable audit records are written.
- `should enforce financial idempotency`: Prevents duplicate payment or refund operations.

### 2.5 Gateway Webhooks & Cryptographic Security (`webhooks.test.js`)
- `should verify Cashfree HMAC-SHA256 signature`: Validates authentic gateway callbacks.
- `should reject forged or missing webhook signatures`: Blocks unverified callback requests with HTTP 401.
- `should ignore duplicate webhook deliveries`: Defends against webhook replays via event ID caching.
- `should verify Shiprocket courier dispatch webhook`: Syncs tracking numbers and dispatch timeline.

---

## 3. Live Server Endpoint Smoke Test Results

All live HTTP endpoints were verified directly against `http://127.0.0.1:5000`:

| Request | Endpoint | HTTP Status | Response Header / Content |
| :--- | :--- | :---: | :--- |
| `GET` | `/health` | `200 OK` | `{"status":"healthy","timestamp":"..."}` |
| `GET` | `/ready` | `200 OK` | `{"ready":true,"database":"connected","redis":"..."}` |
| `GET` | `/api/v1/products?limit=2` | `200 OK` | Real MongoDB data, 24 total products |
| `GET` | `/api/v1/categories` | `200 OK` | 8 active botanical categories |
| `POST`| `/api/v1/checkout/quote` | `200 OK` | Validated pricing quote with GST breakdown |

---

## 4. Frontend Client Production Build Verification

The React 19 / Vite client application was tested and compiled into the production bundle:

```
> client@0.0.0 build
> vite build

vite v8.3.4 building client environment for production...
transforming...
✓ 2460 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                     1.02 kB │ gzip:   0.56 kB
dist/assets/index-DAqvh4Bv.css    109.17 kB │ gzip:  16.73 kB
dist/assets/index-BAvsdL2m.js   1,331.13 kB │ gzip: 353.72 kB
✓ built in 5.78s
```

**Result:** Zero build errors, zero broken imports, and complete compatibility.

