# Divyam Ayurveda — Backend REST API

Production-quality Node.js/Express backend for **Divyam Ayurveda**, an India-focused Ayurvedic e-commerce storefront and administration platform.

---

## 1. Architecture & Tech Stack

- **Runtime:** Node.js 22+ (ES Modules, `"type": "module"`)
- **Web Framework:** Express 5.0 with modular layered design:
  - `routes/v1/` — Route declarations & middleware bindings
  - `controllers/` — Request parsing, orchestration & HTTP status mapping
  - `services/` — Business logic, pricing, reservations & transactions
  - `repositories/` / `models/` — Mongoose ODM schemas & queries
  - `integrations/` — Cashfree PG & Shiprocket adapters with graceful mock fallbacks
  - `middleware/` — Auth, RBAC, Zod validation, idempotency, rate limiting, request tracing & tags
- **Database:** MongoDB 7+ with Mongoose 8
  - Soft delete (`isArchived: true`) for catalog, orders & audit safety
  - All monetary values stored as integer paise (`pricePaise: 24900`)
  - Server-authoritative 12% GST calculation & dynamic shipping rates
- **Validation:** Zod schemas enforcing strict types and Indian postal/mobile formats
- **Security:**
  - JWT access tokens (15 min) + rotating refresh tokens (30 days) with SHA-256 session tracking
  - Password hashing with bcrypt + server-side pepper
  - Database-backed RBAC with 20 discrete permissions and 7 seeded administrative roles
  - Cashfree Webhook HMAC SHA-256 verification
  - Shiprocket Webhook token verification
  - Idempotency middleware (`Idempotency-Key` header with 24h payload hash caching)
  - Helmet, CORS allowlist, request-id propagation, sensitive credential redaction in Pino logs
- **API Documentation:** OpenAPI 3.1 interactive Swagger UI at `/api/docs`
- **Testing:** Vitest + Supertest integration suites

---

## 2. Directory Structure

```text
server/
├── src/
│   ├── app.js                     # Express app setup, raw-body middleware, error handling
│   ├── server.js                  # Boot listener, graceful shutdown signals
│   ├── config/                    # Zod-validated environment config, Pino logger
│   ├── db/                        # Mongoose connection & disconnect helpers
│   ├── constants/                 # Permissions, roles, order/payment status, inventory reasons
│   ├── models/                    # 18 Mongoose models (User, Product, Order, Payment, Shipment, etc.)
│   ├── validators/                # Zod schemas for auth, catalog, cart, checkout, admin
│   ├── middleware/                # Auth, RBAC, idempotency, rateLimiter, errorHandler
│   ├── integrations/
│   │   ├── cashfree/              # Cashfree PG adapter (Orders API 2025-01-01) + mock fallback
│   │   └── shiprocket/            # Shiprocket courier adapter + token caching + mock fallback
│   ├── services/                  # Authoritative business logic (quote, order, inventory, etc.)
│   ├── controllers/               # Express request handlers
│   ├── routes/v1/                 # Versioned API routes (/api/v1/*)
│   ├── utils/                     # Cryptography, token generation, currency, orderNumber generator
│   └── docs/                      # OpenAPI 3.1 specification schema
├── scripts/
│   ├── seed.js                    # Database seeder (categories, products, coupons, settings, etc.)
│   └── create-admin.js            # Standalone CLI admin provisioning tool
├── tests/
│   ├── setup.js                   # Vitest setup hook with test database connection
│   └── integration/
│       ├── auth.test.js           # Auth & profile integration tests
│       ├── rbac.test.js           # RBAC permission denial & role isolation tests
│       ├── catalog.test.js        # Catalog filtering, search, and pagination tests
│       ├── checkout.test.js       # Pricing calculation, quote fingerprint & concurrency tests
│       └── webhooks.test.js       # Cashfree & Shiprocket webhooks, HMAC verification & idempotency
├── docker-compose.yml             # MongoDB 7.0 and API services
├── .env.example                   # Full environment variable template
└── package.json
```

---

## 3. Quickstart & Local Setup

### Option A: Using Docker Compose (Recommended for isolated DB)

1. Start the MongoDB container:
   ```bash
   docker-compose up -d
   ```
2. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Seed the database with catalog, categories, coupons, and sample users:
   ```bash
   npm run seed
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

### Option B: Using a Local MongoDB

If you already have a local MongoDB instance running on `localhost:27017`:
```bash
npm install
npm run seed
npm run dev
```

---

## 4. Administrative Accounts & Credentials

The seed script (`npm run seed`) provisions standard test accounts:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Super Admin** | `admin@divyamayurveda.demo` | `AdminPass!123` | Full Access (`*`) |
| **Content Manager** | `content@divyamayurveda.demo` | `StaffPass!123` | `content.manage`, `reviews.moderate` |
| **Order Manager** | `orders@divyamayurveda.demo` | `StaffPass!123` | `orders.view/update`, `refunds.manage` |
| **Customer** | `customer@divyamayurveda.demo` | `CustomerPass!123` | Customer Storefront Access |

To create or reset the Super Admin account at any time:
```bash
npm run create-admin
```

---

## 5. Running Integration Tests

Run the complete Vitest integration test suite (5 suites, 29 tests):
```bash
npm test
```

Run specific test suites:
```bash
npm run test:webhooks       # Test Cashfree & Shiprocket HMAC verification and deduplication
npx vitest run tests/integration/checkout.test.js  # Test quote calculation & overselling concurrency
```

---

## 6. Interactive OpenAPI Documentation

Once the server is running, browse the interactive Swagger UI:
- **URL:** [http://localhost:5000/api/docs](http://localhost:5000/api/docs)
- **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

---

## 7. Representative cURL Examples

### 7.1 Health Check
```bash
curl -X GET http://localhost:5000/health
```

### 7.2 Customer Registration
```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aarav Patel",
    "email": "aarav.patel@example.in",
    "phone": "9876543210",
    "password": "SecurePassword123!"
  }'
```

### 7.3 Customer Login
```bash
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@divyamayurveda.demo",
    "password": "CustomerPass!123"
  }'
```

### 7.4 Query Catalog Products with Filters
```bash
curl -X GET "http://localhost:5000/api/v1/products?category=wellness-essentials&minPrice=200&maxPrice=1200&sort=price_asc&limit=10"
```

### 7.5 Calculate Authoritative Checkout Quote (ignores client prices)
```bash
curl -X POST http://localhost:5000/api/v1/checkout/quote \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "variantId": "<VARIANT_ID>", "quantity": 2 }
    ],
    "address": {
      "fullName": "Priya Sharma",
      "phone": "9876543210",
      "line1": "108 Palm Meadows, Indiranagar",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560038"
    },
    "deliveryMethod": "standard",
    "couponCode": "WELCOME10"
  }'
```

### 7.6 Place Order with Idempotency Key
```bash
curl -X POST http://localhost:5000/api/v1/orders \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: da_idem_9f83a71b4c" \
  -d '{
    "quoteId": "<QUOTE_ID_FROM_STEP_7_5>",
    "paymentMethod": "cod"
  }'
```

### 7.7 Guest Order Tracking (Requires Order Number + Email)
```bash
curl -X GET "http://localhost:5000/api/v1/orders/track?orderNumber=DA-20261017-000123&email=customer@divyamayurveda.demo"
```

### 7.8 Staff / Admin Login & Access Dashboard
```bash
# 1. Staff Login
STAFF_TOKEN=$(curl -s -X POST http://localhost:5000/api/v1/auth/staff/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@divyamayurveda.demo","password":"AdminPass!123"}' \
  | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

# 2. Access Admin Dashboard
curl -X GET http://localhost:5000/api/v1/admin/dashboard \
  -H "Authorization: Bearer $STAFF_TOKEN"
```

### 7.9 Cashfree Payment Webhook (with HMAC Signature)
```bash
# Timestamp and signature computed with CASHFREE_SECRET_KEY
TIMESTAMP=$(date +%s)
PAYLOAD='{"type":"PAYMENT_SUCCESS_WEBHOOK","data":{"order":{"order_id":"DA-20261017-000123"},"payment":{"cf_payment_id":"cf_pay_999","payment_status":"SUCCESS","payment_amount":499}}}'
SIGNATURE=$(echo -n "${TIMESTAMP}${PAYLOAD}" | openssl dgst -sha256 -hmac "TEST_CF_SECRET_KEY" | cut -d" " -f2)

curl -X POST http://localhost:5000/api/v1/webhooks/cashfree \
  -H "Content-Type: application/json" \
  -H "x-webhook-signature: $SIGNATURE" \
  -H "x-webhook-timestamp: $TIMESTAMP" \
  -d "$PAYLOAD"
```

### 7.10 Shiprocket Tracking Webhook
```bash
curl -X POST http://localhost:5000/api/v1/webhooks/shiprocket \
  -H "Content-Type: application/json" \
  -H "x-shiprocket-token: test_shiprocket_webhook_secret_999" \
  -d '{
    "awb": "AWB-DEL-987654321",
    "current_status": "DELIVERED",
    "activity": "Shipment delivered to customer",
    "location": "Bengaluru Dispensary"
  }'
```
