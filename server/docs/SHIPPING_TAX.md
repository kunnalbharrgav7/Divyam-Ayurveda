# Shipping & Tax (GST) System

One engine calculates delivery, discounts, free-delivery eligibility, express and GST:
`server/src/services/pricing.service.js`. The storefront only displays what the server returns.

```
browser (cart / checkout)            server
  POST /checkout/pricing  ───────►  resolveLines (DB prices, MRP, GST rate)
  (ids + qty + address)             + verify offer / referral
                                    + resolveDestination (zone)   utils/shippingRules.js
                                    + express availability (courier)
                                    + priceBasket  ◄── the only calculation
  ◄── pricing, options, messages
  POST /orders (expectedTotal) ───► same engine again; refuses if the total differs
                                    → Order (pricing snapshot) → Cashfree amount → invoice
```

Everything is integer paise. Nothing from the browser is trusted: not prices, not shipping, not GST, not the total.
The browser sends `pricing.expectedTotal` (the total it displayed); if the server's figure differs, the order is
refused with 409 "The price changed…" and the page shows the new total.

## Zones and destination rules (Admin → Settings → Shipping & Tax)

Precedence, always in this order: **PIN-code exception** (narrowest range first) → **dispatch-state zone** →
**zone listing the state** → **"all other states" zone**. An unknown state, or a zone switched off, is refused
("we don't deliver to this area"); it never falls to a cheaper rate. The "all other states" zone cannot be switched off.

- Recommended setup (a button in the admin form fills it; nothing is saved until Save is pressed):
  Local (dispatch state) ₹40 / free from ₹499 / 1–3 days · Rest of India ₹80 / ₹799 / 3–6 days ·
  Remote ₹120 / ₹1,299 / 5–9 days (J&K, Ladakh, North-East, islands).
- PIN exceptions: ranges must not overlap; each must point at an existing zone (saving is refused otherwise).
- State names are normalised (`Orissa`→`Odisha`, `jammu & kashmir`, `NCT of Delhi`…): `utils/indianStates.js`.
- PIN ↔ state: checked against India Post's directory (`pincode.service.js`). A clear disagreement is refused;
  if the directory is unreachable or doesn't know the PIN the address is allowed. Known older listings
  (Ladakh under J&K, Telangana under Andhra Pradesh, border NCR PINs) are treated as matching.
- Serviceability is separate from the fee: Shiprocket's check (`shipment.service.js`).

## Free delivery

`eligible subtotal = selling price of the products − offer discount − referral discount`
(not MRP, not delivery, not GST added on top, not store credit). Free when `eligible ≥ zone threshold`.

## Express

`express total = standard fee (₹0 when free) + express surcharge`. The surcharge, estimate and on/off are settings.
Express is offered only if the PIN is serviceable and the courier's quickest delivery there is ≤ the configured
number of days (default 2). If the courier can't be reached express is **not** offered (standard still is).
The surcharge is a customer-facing figure; it is not the courier's cost (`Shiprocket rate` is never used for pricing).

## GST

- Mode: prices **include** GST (default; GST is extracted) or **exclude** it (GST is added at checkout).
- Rate per product (`gstRate`, `hsnCode` in the product form); a product without one uses the store default rate.
- Discounts are shared across lines in proportion (to the paisa), so each line's taxable value is exact.
- Same state as the dispatch state → CGST + SGST; anywhere else → IGST.
- Delivery: **no GST line by default.** `tax.shippingTaxMode = "fixed"` + `shippingGstRate` taxes it. The right
  treatment depends on the business's invoicing; confirm with an accountant. The system never guesses a rate.

## What an order stores (never recalculated from today's settings)

`Order.pricing`: MRP subtotal, discounts, eligible subtotal, zone id/name/tier and how it was matched,
delivery method, standard fee (and the fee before a free-delivery waiver), threshold, express surcharge,
shipping tax, GST mode, taxable value, CGST/SGST/IGST, total, store credit.
`Order.items[]`: MRP unit price, discount share, GST rate, HSN, taxable value, tax.

Orders without these fields (placed earlier) keep working: invoices and refunds use the earlier method for them.

## API

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/checkout/pricing` | Price preview (guest or signed in). Returns pricing, delivery options (standard/express with reasons), offer/referral results, address problems. |
| `POST /api/v1/orders` | Places the order with the same engine; `pricing.expectedTotal` is verified. |
| `GET /api/v1/me/orders/:n/invoice`, `GET /api/v1/admin/orders/:n/invoice` | Structured invoice data from the saved snapshot (owner / staff). |
| `PATCH /api/v1/admin/settings` | Zones (`enabled`), `pinExceptions`, express options, tax options. |

## Refunds

Partial cancellations of orders with a snapshot refund each line's price less its own discount share (plus its GST
when GST was added on top), less its share of store credit. Delivery is not refunded on a partial cancellation
(unchanged behaviour); a full cancellation refunds everything remaining.

## Tests

`tests/integration/shipping-pricing-engine.test.js` (pure engine: all zone / threshold / express / GST examples,
random-basket arithmetic checks) and `shipping-pricing-flow.test.js` (preview → order → payment amount → snapshot →
invoice → refund → admin settings, using the mock gateway and mock courier).
