# Divyam Ayurveda — Frontend Client

A premium, responsive, dynamic Ayurvedic e-commerce web application built using React, Vite, Tailwind CSS, and Lucide Icons.

## Tech Stack

- **Framework:** React 19 + Vite
- **Language:** JavaScript (JSX / ES Modules — No TypeScript)
- **Styling:** Tailwind CSS v4 with custom botanical tokens
- **Routing:** React Router v7
- **Icons:** Lucide React
- **State Management:** React Context API + LocalStorage persistence
- **Architecture:** MERN-ready client architecture with dedicated Service Layer

## Project Structure

```text
client/
├── public/
│   └── images/
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── layout/       # AnnouncementBar, Header, CategoryNav, Footer
│   │   ├── home/         # HeroBanner, BestSellers, Trending, NewArrivals, etc.
│   │   ├── products/     # ProductCard, ProductGrid, Filters, ImageGallery
│   │   ├── cart/         # CartItem, OrderSummary
│   │   └── common/       # Button, Badge, Modal, RatingStars, Breadcrumbs
│   ├── layouts/          # MainLayout
│   ├── pages/            # Home, Catalog, ProductDetail, Cart, Checkout, Account, etc.
│   ├── context/          # CartContext, WishlistContext, AuthContext, OrderContext
│   ├── data/             # Centralized mock products, categories, blogs, testimonials
│   ├── services/         # API abstraction layer
│   ├── utils/            # Currency formatter, storage helpers
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── index.html
├── package.json
└── vite.config.js
```

## Available Scripts

- `npm run dev` — Starts the local Vite development server
- `npm run build` — Compiles and builds the production bundle
- `npm run preview` — Locally previews the production build

<!-- 🔑 Instant 1-Click Demo Login Credentials

Both /login and /admin/login feature 1-Click Instant Demo Login buttons:

Role	Email	Password	Pre-configured Access
⚡ Super Administrator	admin@divyamayurveda.demo	admin123	Full access to all 34 management pages, settings, and audit logs
📦 Catalog Manager	catalog@divyamayurveda.demo	admin123	Products, Categories, Brands, Inventory & Botanical Herbs
🚚 Order Fulfillment	fulfillment@divyamayurveda.demo	admin123	Orders, Courier Tracking, Returns & Refunds
🎧 Customer Support	support@divyamayurveda.demo	admin123	Customer Tickets, Contact Enquiries, Reviews Moderation
📈 Marketing Manager	marketing@divyamayurveda.demo	admin123	Homepage Builder, Discounts, Blog & Audience Subscribers
👤 Customer Demo (Aarav)	aarav.sharma@example.com	customer123	Public shopping, wishlist, cart, and order history -->
