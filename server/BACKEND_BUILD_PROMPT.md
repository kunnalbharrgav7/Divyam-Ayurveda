# Divyam Ayurveda — Backend implementation brief

Use this prompt verbatim with the implementation agent. It is based on the existing React client in `../client`, whose storefront and admin dashboard currently use mock/local-storage data. **Build the backend from scratch; do not replace, redesign, or remove client functionality.**

---

## Role and outcome

You are a senior Node.js e-commerce backend engineer. Implement a production-quality REST API for **Divyam Ayurveda**, an India-focused Ayurvedic e-commerce store. Deliver a working server in this `server/` directory and a clear API contract that can replace the client mock service layer.

Use Node.js 22+, Express 5 (ESM), MongoDB 7 with Mongoose, Redis, Zod, JWT, bcrypt/argon2, Pino, Vitest + Supertest, OpenAPI 3.1, and Docker Compose (MongoDB + Redis). Keep the code modular, testable, and secure. Do not use Firebase, a BaaS, or client-side authority for prices, stock, permissions, shipping, payment, or order state.

The frontend routes and screens that must be supported include:

- Public: home, products/catalog, category, product details, cart, wishlist, checkout, order confirmation/tracking, account, referral, blog, ingredients, FAQs, contact, offers.
- Admin: dashboard, products/inventory/categories/brands/collections/ingredients, orders/returns/refunds/coupons, customers/referrals/reviews, homepage/content/blog, enquiries/support/subscribers, reports, users/roles/audit logs/settings.

Preserve the existing frontend’s useful field names where sensible (`slug`, `price`, `originalPrice`, `stockQuantity`, `isFeatured`, `items`, `pricing`, `timeline`). Mongo `_id` should be serialized as `id`; API responses should never leak password hashes, refresh-token hashes, secrets, internal provider payloads, or other customers’ data.

## First actions and acceptance criteria

1. Inspect `../client/src/App.jsx`, `context/*`, `services/api.js`, `services/referralService.js`, `data/*`, and all admin form pages. Create an API mapping document before coding.
2. Scaffold the server with the layout below, `.env.example`, `README.md`, Docker Compose, seed command, lint/format/test scripts, OpenAPI at `/api/docs`, and a health check.
3. Port the seed catalog/categories/content from the client only as development seed data. The database becomes the source of truth.
4. Implement feature slices end-to-end in this order: foundation/auth/RBAC → catalog/content → cart/checkout/orders → Cashfree/Shiprocket → admin/analytics → communication/referrals.
5. Add integration tests for authentication, RBAC denial, product filtering, price recalculation, stock concurrency, coupon/referral exclusivity rules, Cashfree webhook idempotency, and Shiprocket webhook idempotency.
6. Do not claim an integration works until tests, OpenAPI, cURL examples, and startup instructions work locally.

## Required project layout

```text
server/
  src/
    app.js  server.js  config/  db/
    routes/v1/  controllers/  services/  repositories/
    models/  validators/  middleware/  policies/  jobs/
    integrations/cashfree/  integrations/shiprocket/
    utils/  constants/  docs/openapi.js
  tests/{integration,unit}/
  scripts/{seed,create-admin}.js
  uploads/                 # dev only; production uses an object-storage adapter
  docker-compose.yml
  .env.example  README.md  package.json
```

Controllers only validate/coordinate and format HTTP responses. Put business rules and transactions in services; database access/query construction in repositories; external provider calls behind adapters. Add a global error middleware with typed errors. Use `asyncHandler` or equivalent. Use a versioned prefix: `/api/v1`.

## Conventions

- All monetary values are integer paise in storage and API write payloads: `unitPricePaise: 24900`. Responses may also expose derived `price: 249` for the current client, but never calculate from browser-supplied figures.
- Use ISO timestamps, UTC in storage, `Asia/Kolkata` only for business reporting/presentation.
- Public IDs: Mongo IDs are acceptable initially; orders also receive immutable, human-readable unique `orderNumber` such as `DA-20261017-000123`.
- Standard response: `{ "success": true, "data": ..., "meta": { "page", "limit", "total", "totalPages" } }`. Error: `{ "success": false, "error": { "code", "message", "details", "requestId" } }`.
- Pagination defaults: `page=1`, `limit=20`, hard maximum `100`. Whitelist sort values; never pass client sort keys directly to Mongo.
- `DELETE` is soft delete/archive when data may be referenced by orders/audit records. Never hard-delete paid orders, payment records, inventory movements, or audit logs.
- Mutation endpoints require a `Idempotency-Key` header when retrying can create an order, payment session, shipment, refund, inventory adjustment, or referral reward.

## Security, authentication and authorization

Implement both customer and staff authentication.

- Customer auth: register, login, refresh, logout, forgot/reset password, email verification (provider adapter may log in development), profile/password/address management. Use a short-lived access token (15 min) and rotating refresh token (7–30 days), with hashed refresh token/session stored in DB. Prefer an HttpOnly, Secure, SameSite=Lax refresh cookie; if using a bearer refresh token, document XSS tradeoffs. Rate-limit auth and recovery routes.
- Staff auth: same secure flow, not the current mock `loginAsAdmin`. Staff accounts require `isStaff=true`, `status=active` and assigned role(s).
- RBAC must be database-backed. Seed these permissions from the client: `products.view/create/edit/delete`, `inventory.manage`, `categories.manage`, `orders.view/update`, `refunds.manage`, `discounts.manage`, `customers.view/manage`, `reviews.moderate`, `support.manage`, `content.manage`, `reports.view`, `users.manage`, `roles.manage`, `settings.manage`, `audit.view`. Seed roles: Super Admin, Admin, Product Manager, Order Manager, Content Manager, Support Specialist, Analyst. Enforce `requirePermission('orders.update')` etc. at route level and service level for sensitive actions.
- Customers can only access their own profile, addresses, cart, orders, returns, reviews, referral data. Guest order tracking must require order number **and** the order email or phone OTP; never expose an order from its number alone.
- Use helmet, CORS allowlist, request-size limits, Mongo sanitization, XSS-safe validation, structured logs/redaction, request IDs, secure headers, password policy, login throttling, and audit logging. Do not log Authorization headers, passwords, OTPs, Cashfree/Shiprocket secrets, or full card/payment data.
- API keys: do **not** invent a customer API-key system. Gateway and shipping secrets exist only in server environment variables. If internal automation is needed, build an optional hashed, scoped `ApiKey` model (`prefix`, `hash`, `scopes`, `expiresAt`, `revokedAt`, `lastUsedAt`) and send only the one-time plaintext key on creation.

## Environment variables (`.env.example`)

```dotenv
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://mongo:27017/divyam_ayurveda
REDIS_URL=redis://redis:6379
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=replace_with_64_plus_random_bytes
JWT_REFRESH_SECRET=replace_with_different_64_plus_random_bytes
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=30d
COOKIE_SECURE=false
APP_URL=http://localhost:5173
API_URL=http://localhost:5000
PASSWORD_PEPPER=replace_with_random_secret
ENCRYPTION_KEY=base64_32_byte_key_if_encrypting_provider_metadata
CASHFREE_ENV=sandbox
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
CASHFREE_API_VERSION=2025-01-01
CASHFREE_WEBHOOK_URL=https://your-public-api.example/api/v1/webhooks/cashfree
SHIPROCKET_BASE_URL=https://apiv2.shiprocket.in
SHIPROCKET_EMAIL=
SHIPROCKET_PASSWORD=
SHIPROCKET_WEBHOOK_SECRET=
OBJECT_STORAGE_PROVIDER=local
S3_BUCKET=
S3_REGION=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
SMTP_URL=
```

Never commit `.env`, real credentials, access tokens, or webhook samples with secrets. Validate config at boot and fail fast in production. Refresh Cashfree/Shiprocket endpoint/version details from their official documentation at implementation time rather than hardcoding undocumented assumptions.

## MongoDB models and essential indexes

Use Mongoose schemas with timestamps, validation, restrictive enums, `toJSON` transforms, and explicit compound/partial indexes.

| Model | Key fields |
|---|---|
| `User` | `name`, lowercased unique `email`, unique sparse `phone`, `passwordHash`, `isStaff`, `roles[]`, `status`, `addresses[]`, `avatarUrl`, verification/reset fields, `lastLoginAt`, `referralCode` |
| `Role` | unique `name`, `description`, `permissions[]`, protected/system role marker |
| `Product` | `name`, unique `slug`, unique `sku`, `brandId`, `categoryId`, `subcategoryId`, descriptions, `images[]`, `tags[]`, `ingredients[]`, product form, warnings, certifications/origin/shelf life, visibility/status, `isFeatured/isBestSeller/isTrending/isNew`, SEO, aggregate rating/count, variants |
| `ProductVariant` (embedded or separate; choose separate if inventory grows) | `sku`, `label/size`, `pricePaise`, `compareAtPricePaise`, `stockOnHand`, `reservedStock`, `reorderThreshold`, weight/dimensions, active; each cart/order item references its immutable variant snapshot |
| `Category` | `name`, unique `slug`, `shortName`, description, image/banner, parent reference or subcategory documents, display order, featured/status |
| `Brand`, `Collection`, `Ingredient`, `BlogPost`, `Faq`, `Testimonial`, `ContentPage`, `HomepageConfig`, `StoreSettings` | mirror fields in client data; slugs where public; draft/published state and author/timestamps where applicable |
| `Cart` | `userId` or `guestTokenHash`, items `{variantId, quantity}`, coupon/referral context, expiry; never retain trusted prices |
| `Order` | `orderNumber`, user/guest snapshot, addresses snapshot, immutable item/product/variant/name/SKU/image/price/tax snapshots, pricing breakdown, payment/shipment/fulfilment status, status history/timeline, coupon/referral snapshot, notes, version; provider references only |
| `Payment` | order id, `provider=cashfree`, provider order/payment ids, amount/currency, status, raw webhook/event hash, verified timestamps; unique provider payment/event constraints |
| `Shipment` | order id, Shiprocket shipment/order/AWB/courier ids, pickup location, status/status history, labels/manifests/tracking URL, webhook events |
| `InventoryMovement` | variant/product, signed delta, before/after, reason, order/reference, actor, idempotency key; immutable |
| `Coupon` | unique code, type fixed/percent, value, caps/minimum, scope products/categories, usage limits, per-user limit, starts/ends, active, stackability rules |
| `Review` | product/user/order reference, rating 1–5, title/comment, verified purchase, status `pending/approved/rejected`, moderator fields |
| `ReturnRequest` / `Refund` | order/item quantities/reason/evidence, status/history, refund provider reference/amount/reason |
| `ReferralProgram` / `Referral` | settings, code, referrer/referee, attribution expiry, qualified order, reward status/amount, unique constraints to prevent self-referral/duplicate credit |
| `SupportTicket`, `ContactEnquiry`, `Subscriber` | fields shown in client and statuses/notes; email normalized and unique for subscriber |
| `AuditLog` | actor/id/role/IP/user-agent/action/module/target/before/after/requestId/timestamp; append-only |
| `WebhookEvent` / `IdempotencyKey` | provider/event id or payload hash, processing status/result; request key, actor/path/body hash/response/status/expiry |

Required indexes include: unique normalized `User.email`; product `slug`, `sku`, `{status, visibility, categoryId, isFeatured}`, `{pricePaise}`, `{ratingAverage}`, `{createdAt}`; text/Atlas Search index over product name/description/tags/ingredients; order `{userId, createdAt:-1}`, `{orderNumber:1}`, `{status, createdAt:-1}`, `{paymentStatus, createdAt:-1}`; cart/user; review/product/status; coupon/code; audit timestamp; TTL on sessions/reset tokens/carts/idempotency records as appropriate. Use `lean()` for read-heavy list queries and projections for list cards.

## Business logic (non-negotiable)

### Catalog

- Only published/active public products are visible publicly; admin can filter archived/draft products. Product names, slugs and SKUs must be unique case-insensitively.
- Store variant-specific stock and price. Do not decrement a generic product stock when a size/variant is purchased.
- Public product listing filters: `q`, `category`, `subcategory`, `brand`, `collection`, `tag`, `minPrice`, `maxPrice`, `minRating`, `inStock`, `featured`, `bestSeller`, `trending`, `new`, `sort=featured|newest|price_asc|price_desc|rating|popularity`, `page`, `limit`. Filter IDs/slugs with a whitelist and validate ranges.
- Cache public catalog lists/category/menu/settings/homepage reads in Redis. Use keys that contain a version namespace, locale/currency if applicable, and normalized query. Invalidate/bump tags after product/category/collection/settings/content changes. Never serve cache for private/admin/auth data. Use cache-aside with short TTLs and safe fallbacks if Redis fails.

### Price, coupon, referral, tax and shipping calculation

- `POST /checkout/quote` accepts only `{items:[{variantId,quantity}], address, couponCode?, referralCode?, deliveryMethod}`. It reloads all variants, validates stock, calculates line totals, validates coupon/referral, shipping zone and tax, and returns an expiring quote fingerprint. Ignore any client price, total, tax, discount, shipping or payment-status field.
- Use the configured shipping rules from client settings as initial DB values: free threshold ₹499, standard and express fees, zones, origin state Karnataka, 12% GST. Make every rule editable through authorized store settings; calculations must use the saved values.
- Determine intra-state vs interstate GST server-side and snapshot CGST/SGST or IGST in the order. Confirm the desired tax-included/excluded display treatment with product/accounting requirements before go-live.
- Coupon checks: active period, minimum, global and per-user uses, scopes, exclusion/stacking rules. Referral: no self-referral, first qualified order only, expiration, minimum order value, reward only after configured qualifying state (usually delivered/no return window) and never twice.

### Inventory and orders

- Use a MongoDB transaction (replica-set config documented for local dev) or a proven atomic conditional update to reserve stock. The condition must include `stockOnHand - reservedStock >= requestedQty` for every variant. Never oversell under parallel requests.
- Flow: quote → create pending order plus short reservation (for online payment), create Cashfree session → verified payment/webhook → mark paid and convert reservation to sold → create Shiprocket shipment only when fulfilment rules allow. Release expired/failed reservations via a worker; COD may reserve/commit according to a documented policy.
- State machines, not arbitrary strings: order `pending_payment → confirmed → processing → packed → shipped → delivered`, with `cancelled/return_requested/returned`; payment `pending/succeeded/failed/refunded/partially_refunded`; fulfilment `unfulfilled/processing/fulfilled/cancelled`. Validate every transition and append a timeline entry/audit log.
- Server generates numbers, snapshots data and sends notifications asynchronously. An order confirmed by Cashfree must not be duplicated if a customer refreshes or a webhook is retried.

### Cashfree

- Implement `CashfreePaymentService` behind an adapter. The frontend calls **our** API only; `CASHFREE_SECRET_KEY` is never sent to the browser.
- `POST /payments/cashfree/session` takes an order/quote reference, revalidates it, creates or reuses a pending internal order, then creates a Cashfree PG order with a server-generated provider ID, server-calculated INR amount, customer details, `return_url` and `notify_url`. Return only the minimal client checkout data such as `paymentSessionId`, internal `orderNumber`, and environment.
- Implement return/status endpoint, but treat it only as a status refresh. The canonical payment result comes from verified webhook and/or Cashfree server-side payment lookup.
- Read the exact raw request body for `/webhooks/cashfree`, verify its signature using the current Cashfree SDK/documented method and webhook headers, then parse it. Store provider event/payment IDs and a payload hash before processing. Make success/failure/retry delivery idempotent. Verify paid amount/currency/order mapping exactly; never mark an order paid based on a client redirect.
- Use Cashfree Sandbox in development and explicit configuration for production. Provide a mock adapter for deterministic test runs; do not call Cashfree in tests.

### Shiprocket

- Implement `ShiprocketService` behind an adapter. Authenticate/token-cache server-side only. Create a shipment after the order is paid or after an approved COD confirmation, never directly from the client.
- Implement serviceability/rate check by pickup and delivery pincode, payment method, weight and dimensions; cache short-lived results. The product/variant model needs shipping weight/dimensions; fail checkout gracefully until complete data exists.
- Create/order assignment, AWB assignment, label/manifest generation, tracking sync, cancellation, and tracking webhook handling. Persist Shiprocket IDs, AWB, courier, tracking URL, label/manifest URLs and status history.
- Verify documented webhook authenticity if Shiprocket provides a signature/secret; otherwise implement IP/secret validation consistent with their current official docs and idempotently dedupe event IDs/payload hashes. Map provider statuses through a controlled mapping, never directly set arbitrary internal order status.

### Admin, support and reporting

- Every staff mutation produces an AuditLog. Apply optimistic concurrency/version checking to product/settings/order updates to prevent silent overwrite.
- Inventory adjustment requires reason, note, staff actor and idempotency; write an immutable movement record.
- Returns validate order ownership, delivery/eligibility window, quantities already returned, and status. Refunds are staff-authorized, idempotent, recorded separately, and use Cashfree’s documented refund flow if original payment is online.
- Admin dashboard is aggregate/query based, not a frontend calculation. Provide revenue/orders/customers/conversion-ready counts, sales series, top products, low stock, pending actions and date range/timezone filters. Read from indexes/aggregations; cache stable analytics briefly.

## Route contract

All routes are `/api/v1`. Apply `authenticate`, `optionalAuthenticate`, `requireStaff`, and `requirePermission` as indicated. Build all endpoints below; resource collections have standard `GET list`, `POST`, `GET :id-or-slug`, `PATCH`, and archive/delete routes where appropriate.

| Area | Endpoints |
|---|---|
| System | `GET /health`, `GET /ready`, `GET /docs`, `GET /store/settings/public`, `GET /store/homepage` |
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email`; staff uses `/auth/staff/login` or robust staff guard on login |
| Me/account | `GET/PATCH /me`, `PATCH /me/password`, `GET/POST/PATCH/DELETE /me/addresses/:addressId`, `GET /me/orders`, `GET /me/orders/:orderNumber`, `GET/PUT /me/cart`, `POST/PATCH/DELETE /me/cart/items`, `GET/POST/DELETE /me/wishlist` |
| Public catalog | `GET /products`, `GET /products/:slug`, `GET /products/:slug/related`, `GET /products/:slug/reviews`, `GET /categories`, `GET /categories/:slug`, `GET /brands`, `GET /collections`, `GET /ingredients`, `GET /blog`, `GET /blog/:slug`, `GET /faqs`, `GET /testimonials` |
| Store actions | `POST /checkout/quote`, `POST /coupons/validate`, `GET /shipping/serviceability?deliveryPincode=&weightGrams=&cod=`, `POST /contact`, `POST /support/tickets`, `POST /newsletter/subscriptions`, `GET /orders/track?orderNumber=&email=` |
| Orders/payments | `POST /orders` (COD only or create internal draft; idempotent), `GET /orders/:orderNumber`, `POST /payments/cashfree/session`, `GET /payments/cashfree/orders/:orderNumber/status`, `POST /webhooks/cashfree`, `POST /webhooks/shiprocket` |
| Customer engagement | `POST /products/:productId/reviews`, `POST /orders/:orderNumber/returns`, `GET /referrals/me`, `POST /referrals/validate`, `POST /referrals/attribute` |
| Admin catalog | `GET/POST /admin/products`, `GET/PATCH/DELETE /admin/products/:id`, `POST /admin/products/:id/images`, `PATCH /admin/variants/:id`, `POST /admin/inventory/adjustments`; equivalent CRUD for `/admin/categories`, `/admin/brands`, `/admin/collections`, `/admin/ingredients` |
| Admin sales | `GET /admin/orders`, `GET /admin/orders/:orderNumber`, `PATCH /admin/orders/:orderNumber/status`, `POST /admin/orders/:orderNumber/shipments`, `POST /admin/orders/:orderNumber/cancel`, `GET/PATCH /admin/returns/:id`, `POST /admin/refunds` |
| Admin CRM/content | CRUD `/admin/coupons`, `/admin/blog`, `/admin/content-pages`, `GET/PATCH /admin/homepage`, `GET/PATCH /admin/reviews/:id`, `GET/PATCH /admin/enquiries/:id`, `GET/PATCH /admin/support-tickets/:id`, `GET/PATCH /admin/subscribers/:id` |
| Admin users/governance | CRUD `/admin/users`, CRUD `/admin/roles`, `GET /admin/audit-logs`, `GET/PATCH /admin/settings`, `GET /admin/dashboard`, `GET /admin/reports/sales`, `/products`, `/customers`, `/inventory`, `/referrals` |

For admin list endpoints support consistent whitelisted filters: `q`, `status`, resource-specific IDs, `from`, `to`, `sort`, `page`, `limit`. Examples: admin products add `archived`, `lowStock`, `brand`; orders add `paymentStatus`, `fulfilmentStatus`, `customerId`; customers add `hasOrders`, `from/to`; audit logs add `actorId`, `module`, `action`.

## Representative requests to include in README and run successfully

Use Bash cURL syntax below. Also provide an equivalent Postman/Bruno collection. Values are examples; replace IDs after seeding. Do not put real secrets in the collection.

```bash
export API=http://localhost:5000/api/v1

# Public filtered catalog
curl "$API/products?q=turmeric&category=churna-powders&minPrice=10000&maxPrice=50000&inStock=true&sort=price_asc&page=1&limit=12"

# Register and login: capture only the access token in a shell variable for testing
curl -X POST "$API/auth/register" -H 'Content-Type: application/json' \
  -d '{"name":"Kunal Test","email":"kunal@example.test","phone":"9876543210","password":"StrongPass!123"}'
curl -X POST "$API/auth/login" -H 'Content-Type: application/json' \
  -d '{"email":"kunal@example.test","password":"StrongPass!123"}'
export TOKEN='paste_access_token_here'

# Server-authoritative quote. Use a real seeded variant id.
curl -X POST "$API/checkout/quote" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"items":[{"variantId":"REPLACE_VARIANT_ID","quantity":2}],"address":{"fullName":"Kunal Test","phone":"9876543210","line1":"42 MG Road","city":"Bengaluru","state":"Karnataka","pincode":"560001"},"deliveryMethod":"standard","couponCode":"WELCOME10"}'

# COD creation uses the quote fingerprint; all monetary values were calculated by server.
curl -X POST "$API/orders" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -H 'Idempotency-Key: order-test-001' \
  -d '{"quoteId":"REPLACE_QUOTE_ID","paymentMethod":"cod"}'

# Online: create only a Cashfree payment session for a server-created/validated quote.
curl -X POST "$API/payments/cashfree/session" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -H 'Idempotency-Key: cf-test-001' \
  -d '{"quoteId":"REPLACE_QUOTE_ID"}'

# Secure tracking (order number plus email)
curl "$API/orders/track?orderNumber=DA-20261017-000123&email=kunal@example.test"

# Customer review (service verifies eligible purchase before verifiedPurchase=true)
curl -X POST "$API/products/REPLACE_PRODUCT_ID/reviews" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"rating":5,"title":"Excellent","comment":"Genuine product and quick delivery."}'

# Staff login and protected admin filters
curl -X POST "$API/auth/staff/login" -H 'Content-Type: application/json' \
  -d '{"email":"admin@divyamayurveda.demo","password":"seeded-development-password-only"}'
export ADMIN_TOKEN='paste_staff_access_token_here'
curl "$API/admin/products?q=turmeric&status=active&lowStock=false&page=1&limit=20" -H "Authorization: Bearer $ADMIN_TOKEN"

# Create product, then safely adjust a specific variant inventory.
curl -X POST "$API/admin/products" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Organic Moringa Powder","slug":"organic-moringa-powder","sku":"DIV-MOR-250","categoryId":"REPLACE_CATEGORY_ID","brandId":"REPLACE_BRAND_ID","status":"active","shortDescription":"Pure leaf powder","description":"Development test product","variants":[{"sku":"DIV-MOR-250","label":"250g","pricePaise":29900,"compareAtPricePaise":34900,"stockOnHand":50,"reorderThreshold":10,"weightGrams":250}],"images":[],"tags":["Immunity"],"ingredients":["Moringa oleifera"]}'
curl -X POST "$API/admin/inventory/adjustments" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' -H 'Idempotency-Key: stock-test-001' \
  -d '{"variantId":"REPLACE_VARIANT_ID","operation":"add","quantity":10,"reason":"Warehouse receipt","note":"PO-123"}'

# Admin order operation and reports
curl -X PATCH "$API/admin/orders/DA-20261017-000123/status" -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
  -d '{"status":"processing","note":"Picked and packed"}'
curl "$API/admin/reports/sales?from=2026-10-01&to=2026-10-31&timezone=Asia/Kolkata" -H "Authorization: Bearer $ADMIN_TOKEN"
```

Do not present webhook requests as ordinary unauthenticated cURL success tests: their signatures must be generated with the provider’s current method. Instead add a `test:webhooks` script using fixtures and the provider/mock verifier. Document the exact sandbox test path separately.

## Frontend migration plan

After backend is verified, replace `client/src/services/api.js` mock implementation with a fetch/axios client using `VITE_API_URL`, error normalization, access-token refresh handling, and credentials where refresh cookie requires it. Migrate contexts in small vertical slices. Remove direct use of `localStorage` for identity, admin authorization, orders, cart stock/price, and referral reward decisions. Keep local UI state only for presentation/offline convenience. Add route guards based on API session/permissions, not the mock role constants.

## Delivery format

At the end, provide:

1. A concise architecture summary and the exact files created.
2. Commands to run locally, seed, test, lint, and start with Docker.
3. The OpenAPI URL and a complete tested API collection.
4. Test results and known limitations/TODOs (for example, SMTP/object storage credentials not configured).
5. A mapping of every frontend mock service/context operation to its new endpoint.

Make sensible implementation choices, but stop and ask before any irreversible migration, production credential use, live payment charge, or production Shiprocket shipment creation.
