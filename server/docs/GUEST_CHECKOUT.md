# Guest Checkout, Private Tracking and Order Linking

Customers can buy without an account. Signed-in customers get their details pre-filled. A guest can later
add an order to an account with a one-time link. **There is no OTP anywhere in this flow.**

## Customer journeys

| Journey | Steps |
|---|---|
| New customer (guest) | Product → Buy Now → `/checkout` (one page) → Place order / Pay → `/order-confirmation/:orderNumber` → private tracking link |
| Signed-in customer | Product → Buy Now → `/checkout` (name, email, mobile and saved address pre-filled; any saved address selectable; new address can be saved) → Pay → confirmation → My Orders |
| Guest, account later | Guest order → confirmation page "Create account" / "Sign in" (or "Save to my account" if already signed in) → order linked with its one-time claim token → appears in My Orders |

Buy Now, the cart page and checkout no longer require sign-in.

## How guest access works

When an order is placed **without** a session, the server creates two secrets and returns them **once**, in the
order-placement response:

| Secret | Format | Purpose | Stored as |
|---|---|---|---|
| Tracking code | 16 chars Crockford base32 (80 random bits), shown `XXXX-XXXX-XXXX-XXXX` | Private tracking link `/track/<code>` or manual lookup (order ID + code) | SHA-256 hash, unique index |
| Claim token | 32 random bytes (base64url) | Links the order to an account once, valid 30 days | SHA-256 hash, unique index; removed when used |

- Neither secret is derived from the order number, phone or email. Plain values are never stored.
- The browser keeps them in `localStorage` (`divyam_guest_orders`) on the buyer's device only.
- Linking is never automatic: the buyer presses "Save to my account" / "Create account". A pending choice is
  carried through sign-in in `sessionStorage` (same tab) and completed by `OrderContext`.
- Linking is atomic (`findOneAndUpdate` on hash + unexpired + unclaimed + no owner); a used, expired or unknown
  token gets the same answer, and two accounts racing for it cannot both win. Staff accounts cannot claim.
- Orders are no longer matched to accounts by email (emails are not verified). An account sees an order only
  when `order.userId` is that account. Run `node scripts/report-unlinked-orders.js` (read-only) before deploying
  to list any older orders this affects.
- An order number alone reveals nothing: `GET /api/v1/orders/:orderNumber` returns 404 unless you own the order
  or are staff.

### What the private tracking view returns

Order number, dates, statuses, payment status/method, timeline (status/time only), items (name, size, image,
qty, prices), totals, courier/AWB and public shipment events, **city/state/PIN only**, customer name,
**masked** phone (`******1234`) and email (`ab***@domain`), `claimable`, `linkedToAccount`.
It never returns the street address, full phone/email, internal ids, label URLs, staff notes or tokens.

## API

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /api/v1/orders` | optional | Place an order (guest or signed in). Guest response includes `guestAccess { trackingCode, claimToken, claimExpiresAt }`. Any `userId`/`user` in the body is ignored. Accepts `attribution` (fbp, fbc, UTM tags, landing URL). |
| `POST /api/v1/orders/track` | none | Body `{ code, orderNumber? }` → private tracking view. Rate limited (40 / 15 min / IP). Replaces the old `GET /orders/track?orderNumber&email`. |
| `POST /api/v1/orders/claim` | customer | Body `{ claimToken }` → links the guest order to the signed-in account. Rate limited (20 / 15 min / IP). |
| `GET /api/v1/checkout/pincode/:pincode` | none | `{ found, city, state }` from India Post's PIN directory (cached; only pre-fills, never blocks checkout). |
| `POST /api/v1/admin/orders/:orderNumber/tracking-code` | `orders.update` | Issue a new private tracking code (old link stops working). Returns the code once. |
| `DELETE /api/v1/admin/orders/:orderNumber/tracking-code` | `orders.update` | Switch the link off. |
| `POST /api/v1/admin/orders/:orderNumber/notes` | `orders.update` | Add a staff-only note. |
| `GET /api/v1/admin/orders/:orderNumber` | `orders.view` | Now returns the full staff view (it used to return the masked public view), including `adminNotes` and `guestTracking`. |

Payments are unchanged: Cashfree session creation, signature-verified webhooks, idempotent `#markPaid`,
retry from the confirmation page, and COD all work the same for guests.

## Database (MongoDB, `orders` collection; additive, no data removed)

| Field | Notes |
|---|---|
| `checkoutType` | `"guest"` or `"account"` (default). Stays `"guest"` after linking. |
| `guestAccess.trackingTokenHash` | unique sparse index |
| `guestAccess.trackingIssuedAt`, `trackingRevokedAt` | |
| `guestAccess.claimTokenHash` | unique sparse index; `$unset` when used |
| `guestAccess.claimExpiresAt`, `claimedAt`, `claimedBy` | |
| `adminNotes[] { text, authorId, authorName, createdAt }` | staff only |
| `attribution { fbp, fbc, utm*, landingUrl, clientIp, userAgent }` | for Meta matching |
| `metaPurchaseSentAt` | Conversions API Purchase sent once |

All of these are removed from `Order.toJSON()`. JSON gains `isGuest` (guest checkout, or an older order with no
account) and `linkedToAccountAt`. Production does not auto-build indexes, so `server.js` runs
`Order.createIndexes()` at startup (adds missing indexes only, never drops).

Existing orders need no migration: they have no `guestAccess`, so they can't be tracked by code until staff
issue one from the admin order page.

## Meta Ads

- **Pixel (browser):** set `VITE_META_PIXEL_ID` at build time. Events: `PageView`, `ViewContent` (product page),
  `AddToCart`, `InitiateCheckout` (checkout opened, including from Buy Now), `AddPaymentInfo` (Place order),
  `Purchase` (confirmation page: COD at once, online only after the server confirms payment, once per browser).
  The Pixel never loads or fires on `/admin` or `/track/*` (the tracking code is in that URL), automatic
  history/auto-config tracking is off, and no personal data is passed to it.
- **Conversions API (server):** set `META_PIXEL_ID` + `META_CAPI_ACCESS_TOKEN`. `Purchase` is sent once per order
  (COD on placement, online on verified payment) with event id `purchase.<orderNumber>`, the same id as the
  Pixel, so Meta deduplicates. Contact fields are SHA-256 hashed (email, phone, name, city, state, PIN, country,
  external id). The street address, tokens and passwords are never sent. Failures are logged and never affect
  the order.
- First-touch attribution (`fbclid` → `fbc`, UTM tags) is kept in `localStorage` for 7 days and saved on the order.

## New environment variables

| Where | Variable | Required |
|---|---|---|
| client (build) | `VITE_META_PIXEL_ID` | optional (Pixel off when empty) |
| server | `META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN` | optional (CAPI off unless both set) |
| server | `META_TEST_EVENT_CODE` | only while testing in Events Manager |
| server | `META_GRAPH_VERSION` | optional, default `v21.0` |

## Tests

`server/tests/integration/guest-checkout.test.js` covers guest placement, hashed storage and JSON stripping,
ignoring body `userId`, validation, server pricing, private tracking (valid, normalised input, wrong, mismatched,
malformed, revoked, regenerated), privacy of the tracking view, claim (auth required, single use, other account,
race, expiry, staff), no email matching, guest online payment through signed webhooks (plus duplicate and forged
signatures), guest per-customer coupon limits, admin notes and links, and Meta Purchase once/hashed/no
address/not before payment.
