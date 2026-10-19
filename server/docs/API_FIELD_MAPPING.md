# DIVYAM AYURVEDA — API FIELD MAPPING & SCHEMA CONTRACTS

> **Version:** 1.0.0  
> **Target:** Frontend DTOs $\longleftrightarrow$ Zod Validators $\longleftrightarrow$ Express Controllers $\longleftrightarrow$ Mongoose Models $\longleftrightarrow$ MongoDB Collections  

---

## 1. Overview of Serialization & Unit Conventions

To ensure zero arithmetic precision loss, the system enforces strict currency unit conversions between client and server layers:
- **Server / Database Layer:** All monetary amounts are stored strictly as integer **Paise** (`basePricePaise`, `compareAtPricePaise`, `subtotalPaise`, `shippingFeePaise`, `taxPaise`, `totalPaise`).
- **Frontend / Presentation Layer:** All monetary amounts are handled and formatted as **Rupees** (`price`, `compareAtPrice`, `subtotal`, `shipping`, `tax`, `total`).
- **Conversion Utility:** `toRupees(paise)` ($\text{Rupees} = \frac{\text{paise}}{100}$) and `toPaise(rupees)` ($\text{Paise} = \text{round}(\text{rupees} \times 100)$).

---

## 2. Catalog & Products Mapping

### 2.1 Product Entity

| Frontend Field | Frontend Type | Backend Controller / DTO | Mongoose Schema Field | MongoDB Storage Type | Transformation / Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` / `_id` | String | `id` | `_id` | `ObjectId` | Converted to hex string via virtual / lean |
| `name` / `title` | String | `name` | `name` | String | Fallback `title || name` supported |
| `slug` | String | `slug` | `slug` | String | Indexed, lowercase, URL-friendly slug |
| `sku` | String | `sku` | `sku` | String | Uppercase inventory identifier |
| `price` | Number (₹) | `price` | `basePricePaise` | Number (Int) | `price = basePricePaise / 100` |
| `originalPrice` | Number (₹) | `compareAtPrice` | `compareAtPricePaise` | Number (Int) | `originalPrice = compareAtPricePaise / 100` |
| `image` | String (URL) | `image` | `images[0]` | String | Computed from first item in `images` array |
| `images` | Array[String]| `images` | `images` | Array[String] | Array of image asset URLs |
| `categoryId` | String | `categoryId` | `categoryId` | String | Slug / ID of parent category |
| `subcategory` | String | `subcategory` | `subcategory` | String | Human readable subcategory label |
| `subcategoryId` | String | `subcategoryId` | `subcategoryId` | String | Slug / ID of subcategory |
| `brand` | String | `brand` | `brand` | String | Defaults to `"Divyam Ayurveda"` |
| `stockQuantity` | Number | `stockQuantity` | Computed Variant Sum | Number (Int) | $\sum (\text{stockOnHand} - \text{reservedStock})$ |
| `variants` | Array[Object]| `variants` | `ProductVariant` collection | Referenced Docs | Linked via `productId: _id` |
| `rating` | Number | `rating` | `rating` | Number (Float) | Range: 1.0 to 5.0, default 4.8 |
| `reviewCount` | Number | `reviewCount` | `reviewCount` | Number (Int) | Total approved review count |
| `isFeatured` | Boolean | `isFeatured` | `isFeatured` | Boolean | Storefront display flag |
| `isBestSeller` | Boolean | `isBestSeller` | `isBestSeller` | Boolean | Storefront display flag |
| `isTrending` | Boolean | `isTrending` | `isTrending` | Boolean | Storefront display flag |
| `isNew` | Boolean | `isNew` | `isNew` | Boolean | Storefront display flag |
| `status` | String | `status` | `status` | String (Enum) | `"active"`, `"inactive"`, `"archived"` |

---

## 3. Order & Checkout Mapping

### 3.1 Order Request Payload (`POST /api/v1/orders`)

The backend accepts both **Path A** (Quote-based) and **Path B** (Direct checkout):

```json
{
  "customer": {
    "name": "Aarav Sharma",
    "email": "aarav.sharma@example.com",
    "phone": "+91 98765 43210"
  },
  "shippingAddress": {
    "street": "Flat 402, Nilgiri Heights, 12th Main Road, Indiranagar",
    "city": "Bengaluru",
    "state": "Karnataka",
    "pincode": "560038"
  },
  "items": [
    {
      "productId": "6ad3654784d5491fed1851d6",
      "name": "Pure Himalayan Shilajit Resin (Gold Grade)",
      "slug": "pure-himalayan-shilajit-resin-gold",
      "image": "/images/ProductImages/PureHimalayanShilajit.jpeg",
      "size": "20g",
      "price": 999,
      "quantity": 1,
      "total": 999
    }
  ],
  "pricing": {
    "subtotal": 999,
    "shipping": 0,
    "discount": 0,
    "referralDiscount": 0,
    "total": 999,
    "tax": 180,
    "taxType": "GST",
    "taxLabel": "CGST 9% + SGST 9%"
  },
  "deliveryMethod": "standard",
  "paymentMethod": "Cash on Delivery (COD)",
  "paymentStatus": "Pending",
  "notes": "Leave with security if not available."
}
```

### 3.2 Canonical Payment Method Contract

| Raw Input from Frontend / Client | Normalized Canonical Value (`PAYMENT_METHODS`) | Storage in MongoDB (`order.paymentMethod`) | Default Payment Status |
| :--- | :--- | :--- | :--- |
| `"cod"` | `"Cash on Delivery (COD)"` | `"Cash on Delivery (COD)"` | `"pending"` / `"Pending"` |
| `"COD"` | `"Cash on Delivery (COD)"` | `"Cash on Delivery (COD)"` | `"pending"` / `"Pending"` |
| `"Cash on Delivery"` | `"Cash on Delivery (COD)"` | `"Cash on Delivery (COD)"` | `"pending"` / `"Pending"` |
| `"online"` | `"Online Payment"` | `"Online Payment"` | `"succeeded"` / `"Paid"` |
| `"Online"` | `"Online Payment"` | `"Online Payment"` | `"succeeded"` / `"Paid"` |
| `"prepaid"` | `"Online Payment"` | `"Online Payment"` | `"succeeded"` / `"Paid"` |
| `"cashfree"` | `"Online Payment"` | `"Online Payment"` | `"succeeded"` / `"Paid"` |
| `"card"` / `"upi"` / `"netbanking"` | `"Online Payment"` | `"Online Payment"` | `"succeeded"` / `"Paid"` |

### 3.3 Order Entity Mapping

| Frontend Order DTO | Backend Controller | Mongoose Model Field | MongoDB Schema Type | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `orderNumber` / `id` | `orderNumber` | `orderNumber` | String (Unique) | e.g. `DA-782194-412` |
| `customer.name` | `customer.name` | `customer.name` | String | Customer full name |
| `customer.email` | `customer.email` | `customer.email` | String | Customer contact email |
| `customer.phone` | `customer.phone` | `customer.phone` | String | Customer 10-digit phone |
| `shippingAddress.street` | `shippingAddress.street` | `shippingAddress.line1` | String | Street address line |
| `shippingAddress.city` | `shippingAddress.city` | `shippingAddress.city` | String | City name |
| `shippingAddress.state` | `shippingAddress.state` | `shippingAddress.state` | String | Indian State name |
| `shippingAddress.pincode`| `shippingAddress.pincode`| `shippingAddress.pincode`| String | 6-digit PIN code |
| `pricing.subtotal` | `pricing.subtotal` | `pricing.subtotalPaise` | Number (Int) | Stored as paise |
| `pricing.shipping` | `pricing.shipping` | `pricing.shippingFeePaise` | Number (Int) | Stored as paise |
| `pricing.discount` | `pricing.discount` | `pricing.discountPaise` | Number (Int) | Stored as paise |
| `pricing.total` | `pricing.total` | `pricing.totalPaise` | Number (Int) | Stored as paise |
| `paymentMethod` | `paymentMethod` | `paymentMethod` | String (Enum) | Canonical standard |
| `paymentStatus` | `paymentStatus` | `paymentStatus` | String (Enum) | `"pending"`, `"succeeded"`, `"failed"`, `"refunded"` |
| `status` / `orderStatus` | `status` | `status` | String (Enum) | `"confirmed"`, `"processing"`, `"shipped"`, `"delivered"`, `"cancelled"` |
| `timeline` | `timeline` | `timeline` | Array[SubDoc] | Step completion status and timestamps |

---

## 4. User & Authentication Mapping

| Client User State (`AuthContext`) | Backend Login Response | Mongoose `User` Model | MongoDB Field Type |
| :--- | :--- | :--- | :--- |
| `user.id` | `user.id` / `user._id` | `_id` | `ObjectId` |
| `user.name` | `user.name` | `name` | String |
| `user.email` | `user.email` | `email` | String (Unique, Lowercase) |
| `user.phone` | `user.phone` | `phone` | String |
| `user.isStaff` | `user.isStaff` | `isStaff` | Boolean |
| `user.role` | Derived (`admin` vs `customer`)| `roles` (Array[Role]) | Array[ObjectId] / String |
| `user.accessToken` | `tokens.accessToken` | N/A (Stateless JWT) | N/A (Signed JWT in response) |

---

## 5. Taxonomy Mapping (Categories & Collections)

| Frontend Category | Backend Controller | Mongoose `Category` Field | Notes |
| :--- | :--- | :--- | :--- |
| `id` / `slug` | `id` / `slug` | `slug` (String, Unique) | Lowercase URL slug |
| `name` | `name` | `name` (String) | Category display title |
| `description` | `description` | `description` (String) | Botanical description |
| `image` | `image` | `image` (String) | Category tile thumbnail URL |
| `bannerImage` | `bannerImage` | `bannerImage` (String) | Header banner image URL |
| `subcategories` | `subcategories` | `subcategories` (Array) | Nested subcategory items |
| `displayOrder` | `displayOrder` | `displayOrder` (Number) | Sort ordering |
| `status` | `status` | `status` (String Enum) | `"active"`, `"inactive"` |

