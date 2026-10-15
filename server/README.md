# Divyam Ayurveda - Server Architecture (Planned)

This directory is reserved for the future Node.js, Express, and MongoDB backend of **Divyam Ayurveda**.

## Planned Architecture

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens) with bcrypt password hashing
- **Payment Gateway:** Razorpay / Stripe integration for Indian and international payment processing
- **Media Storage:** Cloudinary or AWS S3 for product images and certificates

## Planned API Endpoints

- `/api/auth` - User registration, authentication, token refresh, password recovery
- `/api/users` - User profiles, addresses, preferences
- `/api/products` - Product catalog, filters, search, stock levels, reviews
- `/api/categories` - Category tree and featured collections
- `/api/cart` - Server-side cart synchronization
- `/api/orders` - Order placement, checkout verification, tracking, status updates
- `/api/newsletter` - Email subscription management
- `/api/contact` - Customer inquiry handling

The current frontend in `../client` communicates through a dedicated service layer (`src/services/api.js`) which allows seamless switching from mock data to real backend APIs once initialized.

