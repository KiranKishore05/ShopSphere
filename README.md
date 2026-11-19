# ShopSphere — Luxury Indian & Global Fashion E-Commerce Platform

> **Status:** Under Development
> **Architecture:** Decoupled MERN Monorepo (React + Vite SPA, Node.js + Express REST API, MongoDB Atlas)

ShopSphere is an advanced full-stack fashion retail platform engineered with the MERN stack, designed for Men's, Women's, and Kids' apparel, traditional ethnic wear, and modern luxury collections. The platform combines an editorial-grade storefront with a secure transactional commerce engine and an administrative merchant suite.

---

## Table of Contents

- [Project Status](#project-status)
- [Project Objectives](#project-objectives)
- [Feature Matrix](#feature-matrix)
- [Technology Stack](#technology-stack)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Database Seeding](#database-seeding)
  - [Development Commands](#development-commands)
- [API Architecture & Endpoints](#api-architecture--endpoints)
- [Security Architecture](#security-architecture)
- [Testing & Quality Assurance](#testing--quality-assurance)
- [Target Hosting Architecture](#target-hosting-architecture)
- [Screenshots](#screenshots)
- [Roadmap & Development Progress](#roadmap--development-progress)
- [Author & Repository](#author--repository)

---

## Project Status

```
[ DEVELOPMENT STATUS: UNDER ACTIVE DEVELOPMENT ]
```

ShopSphere is actively under development. Core customer storefront flows, multi-variant catalog browsing, shopping bag operations, server-authoritative checkout, CSRF defenses, and administrative merchant tools have been implemented and locally verified.

**This application is not yet production-ready or fully deployed.** Live payment processing through Razorpay, remote transactional email delivery with domain verification, and remote cloud hosting remain in progress.

---

## Project Objectives

1. **Editorial Fashion User Experience**: Deliver an editorial storefront aesthetic inspired by modern luxury publications, featuring curated lookbooks, responsive image galleries, and multi-category showcases across Men, Women, and Kids fashion.
2. **Server-Authoritative Pricing & Stock Integrity**: Ensure every calculation (subtotals, multi-tier shipping fees, voucher allocations, and line totals) is computed strictly server-side with atomic conditional inventory deduction (`findOneAndUpdate` with stock balance guards) and compensating rollback controls.
3. **Defense-in-Depth Security**: Implement CSRF mitigation for cross-site cookie architectures, strict raw-buffer Razorpay webhook HMAC validation, timing-safe cryptographic comparisons, and state-invalidating password reset session controls.
4. **Resilient Transactional Messaging**: Employ the Transactional Outbox pattern to decouple transactional notifications (order confirmation, payment cancellation, shipping updates, password resets) from user HTTP requests.
5. **Administrative Merchant Tooling**: Provide merchant operations for catalog curation, SKU-level inventory adjustments, discount voucher campaigns, patron relationship tracking, and customer review moderation.

---

## Feature Matrix

### Implemented Features (Locally Verified)

| Domain | Implemented Capabilities |
| :--- | :--- |
| **Authentication & Profile** | Customer registration, login, logout, profile update (`name`, `phone`), and address book management (with single-default address enforcement). Account-level lockout protection (`SEC-06-02`) after 5 consecutive failed login attempts with a 15-minute lock window, and strict password complexity validation (`SEC-06-04`) requiring uppercase, lowercase, numeric, and special characters. |
| **Session & Password Security** | HTTP-only cookie JWT sessions; immediate session invalidation on password reset (`SEC-06-01`) enforcing a fail-closed same-second timestamp boundary (`decoded.iat <= passwordChangedSeconds`); single-use SHA-256 password reset tokens with AES-256-GCM outbox encryption. |
| **Catalog & Discovery** | Multi-faceted product browsing, live search autocomplete, category filtering (Men, Women, Kids), price sorting, stock filtering, single-product detail page with dynamic variant selectors (color, size, SKU), and optimized single-query category aggregations eliminating N+1 database loops. |
| **Brand & Customer Care** | Dedicated atelier heritage showcase (`/about`), interactive concierge customer care portal with client-side inquiry validation (`/contact`), and comprehensive customer policy suites (`/shipping-policy`, `/returns-policy`, `/privacy`, `/terms`). |
| **Cart & Wishlist** | Server-authoritative cart with availability checks, quantity updates, item removal, and persistent customer wishlist management. |
| **Checkout & Pricing** | Automated server-side calculation of subtotals, inclusive luxury taxes, coupon deductions, and tiered shipping thresholds (free shipping qualification). |
| **Payment Integration** | Razorpay digital order creation (`INR`), client-side payment modal flow, and server-side HMAC SHA-256 payment signature verification (*Verified locally in Test Mode with mock/test credentials; live payment gateway activation pending*). Cash on Delivery (COD) with configurable threshold limits (₹20,000 maximum). |
| **Webhook Processing** | Idempotent Razorpay webhook ingestion (`payment.captured`, `order.paid`, `payment.failed`) with raw-body `Buffer` validation and timing-safe signature matching (*Verified via local automated regression tests; live production webhook delivery from Razorpay servers is pending*). |
| **Order Management** | Idempotent order checkout with duplicate submission protection, customer order history (`/orders/me`), single-order tracking (`/orders/me/:orderNumber`), and customer cancellation with automated inventory replenishment. |
| **Customer Reviews** | Verified-purchase review submissions (restricted to delivered orders), customer review editing and deletion, rating distribution metrics (1–5 stars), and automatic product average score recalculation. |
| **Merchant Administration** | Protected `/api/v1/admin` console (`restrictTo('admin')`): revenue/order KPI analytics, product CRUD with multi-variant SKU matrices, category management, inventory movement auditing, order fulfillment status transitions, customer patron dossiers with lifetime spend, coupon campaigns, and review moderation. |
| **Transactional Outbox Email** | Outbox polling worker with exponential backoff and retry leasing; HTML email templates with HTML-entity escaping (`escapeHtml`) on dynamic user inputs to mitigate injection risks; covers welcome, order confirmation, cancellation, and password reset flows (*Verified using mock transport; live Brevo API delivery, sender domain verification, and SPF/DKIM/DMARC DNS configuration are pending*). |
| **Security Controls** | Helmet security headers, IP-based rate limiting on global and authentication routes, Origin and custom-header CSRF validation for state-changing cookie requests, and centralized error logging that sanitizes secrets in production. |

### In-Progress Features

- Comprehensive end-to-end multi-device QA across mobile, tablet, and desktop viewports.
- Production verification of live Razorpay merchant credentials and live webhook delivery on public domains.
- Live Brevo API production transport activation and sender domain authentication (SPF, DKIM, DMARC records).
- Automated CI/CD linting and integration testing pipelines across all workspaces.

### Planned Features

- Faceted catalog filtering by fabric, weave, occasion, and seasonal collection.
- Real-time customer delivery updates via SMS or WhatsApp gateway.
- Multi-currency pricing engine (USD, EUR, GBP) for international shipping.
- Automated customer returns, exchange workflows, and refund balance ledger.

---

## Technology Stack

The technology stack is based on the project's actual `package.json` specifications:

### Frontend (`client/package.json`)

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **React** | `^18.3.1` | Core UI library for component-driven views |
| **Vite** | `^6.0.3` | Next-generation frontend tooling and bundler |
| **Tailwind CSS** | `^3.4.16` | Utility-first CSS framework for luxury editorial styling |
| **React Router DOM** | `^6.28.0` | Client-side declarative routing and navigation guards |
| **TanStack React Query** | `^5.62.7` | Server state management, caching, and background synchronization |
| **Zustand** | `^5.0.2` | Minimal client state management for UI, cart, and authentication |
| **React Hook Form** | `^7.54.1` | Performant form state management and input handling |
| **Zod** | `^3.24.1` | Client-side schema validation and type inference |
| **Axios** | `^1.7.9` | Promise-based HTTP client configured with credentials and CSRF headers |
| **Lucide React** | `^0.468.0` | Iconography |

### Backend (`server/package.json`)

| Technology | Version | Purpose |
| :--- | :--- | :--- |
| **Node.js** | `>=18.0.0` | Server runtime environment (ES Modules) |
| **Express.js** | `^4.21.2` | RESTful API web framework |
| **Mongoose** | `^8.9.0` | Object Data Modeling (ODM) for MongoDB Atlas |
| **jsonwebtoken** | `^9.0.2` | Stateless JSON Web Token authentication |
| **bcryptjs** | `^2.4.3` | Password hashing with cost factor 12 |
| **Razorpay SDK** | `^2.9.8` | Payment gateway order generation and management |
| **Cloudinary SDK** | `^2.11.0` | Cloud asset management and image delivery |
| **Helmet** | `^8.0.0` | HTTP response security headers |
| **CORS** | `^2.8.5` | Cross-Origin Resource Sharing with strict origin verification |
| **Cookie Parser** | `^1.4.7` | HTTP cookie parsing for signed and unsigned session tokens |
| **Express Rate Limit** | `^7.5.0` | Rate limiting for DDoS and brute-force mitigation |
| **Compression** | `^1.8.2` | Gzip/deflate response compression |
| **Morgan** | `^1.10.0` | HTTP request logging |
| **Zod** | `^3.24.1` | Server-side runtime schema validation middleware |

### Tooling & Testing

| Technology | Purpose |
| :--- | :--- |
| **Vitest** (`^2.1.8`) | Fast, native ESM unit and integration test runner |
| **Supertest** (`^7.0.0`) | Programmatic HTTP assertion library for backend route testing |
| **React Testing Library** | Component DOM testing utilities |
| **jsdom** (`^25.0.1`) | Headless browser environment for client tests |
| **Concurrently** (`^9.1.0`) | Simultaneous execution of client and server development processes |
| **Nodemon** (`^3.1.9`) | Automatic backend server reloading in development |

---

## Repository Structure

```
shopsphere/
├── client/                          # Frontend Application (React + Vite)
│   ├── public/                      # Static assets and favicon
│   ├── src/
│   │   ├── components/              # UI Components (layout, products, admin, common)
│   │   ├── hooks/                   # Custom React hooks (useAuth, useCart, useAdmin)
│   │   ├── lib/                     # Axios client and utility helpers
│   │   ├── pages/                   # Application views and page-level routes
│   │   │   └── admin/               # Dedicated administrative management views
│   │   ├── services/                # API client abstraction services
│   │   ├── store/                   # Zustand global stores (auth, cart, UI)
│   │   ├── App.jsx                  # Root router configuration
│   │   ├── index.css                # Tailwind directives and editorial font imports
│   │   └── main.jsx                 # Application entry point
│   ├── .env.example                 # Frontend environment template
│   ├── package.json                 # Client dependencies and build scripts
│   ├── vercel.json                  # Vercel SPA rewrite configuration
│   └── vite.config.js               # Vite bundler configuration
├── server/                          # Backend Application (Node.js + Express)
│   ├── src/
│   │   ├── config/                  # Database, environment validation (env.js)
│   │   ├── controllers/             # Request handlers (auth, catalog, orders, payments, admin)
│   │   ├── middleware/              # Auth, CSRF protection, error handling, rate limiting
│   │   ├── models/                  # Mongoose data schemas (User, Product, Order, Payment, etc.)
│   │   ├── routes/                  # Express route definitions (/api/v1/*)
│   │   ├── scripts/                 # Database seed and maintenance scripts
│   │   ├── services/                # Business services (inventory, coupon, email outbox)
│   │   ├── utils/                   # Tokens, CORS origins, cryptographic helpers
│   │   ├── validators/              # Zod validation schemas
│   │   ├── app.js                   # Express application setup and middleware pipeline
│   │   └── server.js                # Server entry point and database lifecycle
│   ├── tests/                       # Vitest integration and security suites
│   ├── .env.example                 # Server environment template
│   └── package.json                 # Server dependencies and test scripts
├── docs/                            # Architecture specifications and technical documentation
│   ├── api.md                       # REST API endpoint contracts
│   ├── architecture.md              # System architecture and data flows
│   ├── database-design.md           # Schema diagrams and state machines
│   ├── deployment.md                # Deployment and hosting specifications
│   ├── design-system.md             # Typography, palette, and component design tokens
│   ├── requirements.md              # Functional requirements and acceptance criteria
│   ├── testing.md                   # Quality assurance strategy
│   └── transactional-email.md       # Outbox architecture and email specifications
├── .gitignore                       # Git ignore rules for root, client, and server
├── package.json                     # Monorepo root workspace configuration
├── render.yaml                      # Render Blueprint deployment definition
└── README.md                        # Project documentation
```

---

## Getting Started

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher
- **MongoDB**: Local MongoDB instance (`mongodb://localhost:27017`) or free-tier MongoDB Atlas cluster

### Installation

Clone the repository and install dependencies across all workspaces:

```bash
git clone https://github.com/KiranKishore05/ShopSphere.git
cd ShopSphere

# Install all workspace dependencies from root
npm install
```

### Environment Configuration

ShopSphere requires separate environment files for the client and the server. **Never commit actual `.env` files to source control.**

> [!WARNING]
> **Environment Security & Production Secret Requirements**:
> - All sample values in the `.env` examples below are **strictly local-development and test placeholders**.
> - **Never use these placeholder secrets in staging or production environments.**
> - Production deployments must generate unique, cryptographically strong random secrets for `JWT_SECRET`, `COOKIE_SECRET`, `EMAIL_TOKEN_SECRET`, and `ADMIN_BOOTSTRAP_KEY` (minimum 32 characters / 64 hex characters, e.g. generated via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
> - The production startup validator (`server/src/config/env.js`) automatically inspects these keys and will abort startup if development placeholders, weak passphrases, or localhost database URIs are detected.

#### 1. Server Environment (`server/.env`)

Copy the template from `server/.env.example`:

```bash
cp server/.env.example server/.env
```

Populate the required keys in `server/.env` with local development placeholders:

```ini
# Runtime
NODE_ENV=development
PORT=5000

# Client Origins (Local Vite dev server)
CLIENT_ORIGIN=http://localhost:5173
ALLOWED_ORIGINS=http://localhost:5173
APP_BASE_URL=http://localhost:5173
TRUST_PROXY=1

# Database Connection (Local MongoDB instance)
MONGODB_URI=mongodb://localhost:27017/shopsphere

# Security & Authentication (Development Placeholders Only — Production requires 32+ char random secrets)
JWT_SECRET=dev_jwt_secret_shopsphere_min_32_characters_long_key
JWT_EXPIRES_IN=7d
COOKIE_SECRET=dev_cookie_secret_shopsphere_min_32_characters_long_key

# Payment Gateway (Razorpay Local Test Mode Placeholders)
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=rzp_secret_placeholder
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_placeholder

# Media Storage (Cloudinary Placeholders)
CLOUDINARY_CLOUD_NAME=shopsphere-fashion
CLOUDINARY_API_KEY=placeholder_api_key
CLOUDINARY_API_SECRET=placeholder_api_secret

# Admin Bootstrap (Local-Development Placeholder Only)
# Used only during initial database bootstrap; production must supply a strong random key
ADMIN_BOOTSTRAP_KEY=bootstrap_secret_token_12345

# Transactional Email Infrastructure (Local Mock Mode)
EMAIL_PROVIDER=mock
EMAIL_FROM_ADDRESS=orders@shopsphere.in
EMAIL_FROM_NAME=ShopSphere
EMAIL_SUPPORT_ADDRESS=support@shopsphere.in
EMAIL_TOKEN_SECRET=dev_email_token_secret_shopsphere_min_32_characters_key
EMAIL_WORKER_ENABLED=true
```

#### 2. Client Environment (`client/.env`)

Copy the template from `client/.env.example`:

```bash
cp client/.env.example client/.env
```

Populate `client/.env`:

```ini
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_RAZORPAY_KEY_ID=rzp_test_placeholder
VITE_CLOUDINARY_CLOUD_NAME=shopsphere-fashion
VITE_APP_NAME=ShopSphere
```

### Database Seeding

Populate the local database with initial fashion categories, multi-variant products, promotional coupons, and administrative credentials:

```bash
npm run seed
```

*Note: The seed script outputs the initial administrator credentials upon completion.*

### Development Commands

All workspace tasks can be executed from the root directory:

```bash
# Start both server and client concurrently
npm run dev

# Start server only (Node.js + Nodemon on port 5000)
npm run dev:server

# Start client only (Vite on http://localhost:5173)
npm run dev:client

# Build frontend for production
npm run build
```

---

## API Architecture & Endpoints

All backend endpoints are prefixed with `/api/v1` and return structured JSON responses.

### Public & Customer Endpoints

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/v1/health` | Service and database readiness health check | No |
| `POST` | `/api/v1/auth/register` | Register a new customer account | No |
| `POST` | `/api/v1/auth/login` | Authenticate customer and receive session cookie | No |
| `POST` | `/api/v1/auth/logout` | Clear authentication session cookie | No |
| `GET` | `/api/v1/auth/me` | Fetch authenticated customer profile | Yes |
| `POST` | `/api/v1/auth/forgot-password` | Request password reset email | No |
| `POST` | `/api/v1/auth/reset-password` | Reset password using single-use token | No |
| `PATCH` | `/api/v1/users/me` | Update customer name or phone | Yes |
| `GET` | `/api/v1/users/me/addresses` | List customer saved shipping addresses | Yes |
| `POST` | `/api/v1/users/me/addresses` | Add new shipping address to address book | Yes |
| `PATCH` | `/api/v1/users/me/addresses/:id` | Update existing address or toggle default | Yes |
| `DELETE` | `/api/v1/users/me/addresses/:id` | Remove address from address book | Yes |
| `GET` | `/api/v1/products` | Paginated product catalog with search and filters | No |
| `GET` | `/api/v1/products/search/suggestions` | Autocomplete search suggestions | No |
| `GET` | `/api/v1/products/:slug` | Retrieve single product details and variants | No |
| `GET` | `/api/v1/categories` | List all active product categories | No |
| `GET` | `/api/v1/categories/:slug` | Retrieve single category details by slug | No |
| `GET` | `/api/v1/categories/:slug/products` | List all products belonging to a category | No |
| `GET` | `/api/v1/cart` | Retrieve customer active shopping bag | Yes |
| `POST` | `/api/v1/cart/items` | Add item variant to shopping bag | Yes |
| `PATCH` | `/api/v1/cart/items/:sku` | Adjust quantity of cart item | Yes |
| `DELETE` | `/api/v1/cart/items/:sku` | Remove item from cart | Yes |
| `GET` | `/api/v1/wishlist` | Retrieve customer wishlist | Yes |
| `POST` | `/api/v1/wishlist/items` | Add product to wishlist | Yes |
| `DELETE` | `/api/v1/wishlist/items/:id` | Remove product from wishlist | Yes |
| `POST` | `/api/v1/orders/checkout` | Submit order with server-side price calculation | Yes |
| `GET` | `/api/v1/orders/me` | List customer order history | Yes |
| `GET` | `/api/v1/orders/me/:orderNumber` | Detailed order summary and shipment tracking | Yes |
| `PATCH` | `/api/v1/orders/me/:orderNumber/cancel` | Cancel order and release inventory | Yes |
| `POST` | `/api/v1/coupons/apply` | Validate coupon code against subtotal | Yes |
| `POST` | `/api/v1/payments/razorpay/create-order` | Generate official Razorpay payment order | Yes |
| `POST` | `/api/v1/payments/razorpay/verify` | Verify Razorpay payment signature | Yes |
| `POST` | `/api/v1/payments/razorpay/failed` | Record client-side payment cancellation | Yes |
| `POST` | `/api/v1/payments/razorpay/webhook` | Ingest Razorpay server-to-server webhooks | No (HMAC) |
| `GET` | `/api/v1/reviews/:productId` | List approved customer reviews for product | No |
| `GET` | `/api/v1/reviews/eligibility/:productId` | Check if customer is eligible to review product | Yes |
| `POST` | `/api/v1/reviews` | Submit verified-purchase review | Yes |
| `PATCH` | `/api/v1/reviews/:id` | Edit own product review | Yes |
| `DELETE` | `/api/v1/reviews/:id` | Delete own product review | Yes |

### Administrative Endpoints (`/api/v1/admin/*`)

*All administrative endpoints require `protect` and `restrictTo('admin')`.*

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/admin/dashboard` | Dashboard overview and financial KPIs |
| `GET` | `/api/v1/admin/analytics/summary` | Aggregated analytics and sales metrics |
| `GET` | `/api/v1/admin/products` | List and search all catalog items |
| `POST` | `/api/v1/admin/products` | Create new product with variant matrix |
| `GET` | `/api/v1/admin/products/:id` | Retrieve single product details for editing |
| `PATCH` | `/api/v1/admin/products/:id` | Update product details, pricing, and variants |
| `DELETE` | `/api/v1/admin/products/:id` | Soft-delete or archive product |
| `POST` | `/api/v1/admin/products/upload-image` | Upload product image to Cloudinary |
| `GET` | `/api/v1/admin/categories` | List all categories including inactive |
| `POST` | `/api/v1/admin/categories` | Create new fashion category |
| `GET` | `/api/v1/admin/categories/:id` | Retrieve single category details |
| `PATCH` | `/api/v1/admin/categories/:id` | Update category details or status |
| `DELETE` | `/api/v1/admin/categories/:id` | Soft-delete or archive category |
| `GET` | `/api/v1/admin/inventory` | Inventory overview with low-stock warnings |
| `POST` | `/api/v1/admin/inventory/adjust` | Record manual stock adjustment with audit note |
| `GET` | `/api/v1/admin/inventory/movements` | Paginated ledger of stock movements |
| `GET` | `/api/v1/admin/orders` | Order management queue with status filters |
| `GET` | `/api/v1/admin/orders/:id` | Order fulfillment dossier and customer snapshot |
| `PATCH` | `/api/v1/admin/orders/:id/status` | Advance order status via state machine |
| `GET` | `/api/v1/admin/customers` | Patron directory with lifetime spend metrics |
| `GET` | `/api/v1/admin/customers/:id` | Customer profile and transaction history |
| `PATCH` | `/api/v1/admin/customers/:id/status` | Activate or deactivate customer account |
| `GET` | `/api/v1/admin/coupons` | List all promotional vouchers |
| `POST` | `/api/v1/admin/coupons` | Create promotional voucher |
| `PATCH` | `/api/v1/admin/coupons/:id` | Update discount parameters or active dates |
| `DELETE` | `/api/v1/admin/coupons/:id` | Deactivate or remove coupon voucher |
| `GET` | `/api/v1/admin/reviews` | Review moderation queue |
| `PATCH` | `/api/v1/admin/reviews/:id/moderation` | Approve or reject customer review |
| `DELETE` | `/api/v1/admin/reviews/:id` | Delete customer review permanently |

---

## Security Architecture

1. **Cross-Site Request Forgery (CSRF) Protection**:
   - Because cross-origin hosting (e.g. Vercel client on `https://shopsphere.vercel.app` and Render server on `https://shopsphere-api.onrender.com`) necessitates `SameSite: none` cookies in production, custom middleware validates that state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) carry both a verified trusted `Origin` (or trusted `Referer`) and a custom `X-Requested-With: XMLHttpRequest` header.
2. **Webhook HMAC Raw-Body Verification (SEC-05 Hardened)**:
   - Razorpay webhook verification operates directly on the captured raw request `Buffer` (`req.rawBody`).
   - The vulnerable fallback (`JSON.stringify(req.body)`) has been eliminated, preventing signature verification bypasses caused by JSON formatting variations or key reordering.
   - Webhook secrets are validated against empty, whitespace, or placeholder values.
3. **Password Reset Session Invalidation (SEC-06-01 Hardened)**:
   - Password reset records an atomic `passwordChangedAt` timestamp.
   - Authentication middleware validates session tokens against the password change timestamp. Because JWT `iat` timestamps are represented in whole integer seconds while JavaScript Date timestamps have millisecond precision, the comparison enforces a **fail-closed boundary**:
     ```javascript
     const passwordChangedSeconds = Math.floor(currentUser.passwordChangedAt.getTime() / 1000);
     if (decoded.iat <= passwordChangedSeconds) {
       return next(new AppError('Session invalidated due to a recent password reset. Please sign in again.', 401, 'UNAUTHORIZED'));
     }
     ```
   - Any token issued in the same second as or before the password change is strictly rejected, closing the vulnerability where an old token issued earlier in that second could remain valid. Newly authenticated sessions issued after the password reset must carry an `iat` strictly greater than the password change second.
4. **IDOR & Resource Ownership Enforced**:
   - Customer-facing operations (shopping bag, wishlist, order history, order cancellation, address book management, review modifications, and customer-initiated Razorpay order creation/verification) enforce resource ownership by querying `userId: req.user._id` directly from the verified session, preventing unauthorized cross-user data tampering.
   - Server-to-server Razorpay webhooks (`/api/v1/payments/webhook`) operate outside customer authentication sessions; they do not use `req.user._id` and are instead secured via raw-body HMAC SHA-256 signature verification, cross-order payment ID conflict detection, and event deduplication.
5. **Constant-Time Cryptographic Operations**:
   - All signature and token comparisons employ `crypto.timingSafeEqual` with byte-length equality pre-checks to mitigate timing attack side channels.

---

## Testing & Quality Assurance

ShopSphere uses **Vitest** for native ESM test execution across both client and server applications.

### Running Automated Tests

```bash
# Run all tests across workspaces
npm test

# Run backend test suite
npm run test:server

# Run frontend test suite
npm run test:client
```

### Verified Test Suites

The test suites include comprehensive unit, integration, and mock suites covering:
- **Frontend SPA Suite**: 10 test files (89 tests passed) in `client/src` covering routing guards, catalog interactions, shopping bag, checkout experience, customer orders, reviews, and admin views.
- **Security & Hardening**: `server/tests/security.test.js` (57 tests passed — environment validation, session invalidation, same-second precision boundaries, rate-limiting, error log masking, SEC-06-02 account lockout, and SEC-06-04 password complexity).
- **CSRF Defense**: `server/tests/csrf.test.js` (27 tests passed — origin validation, custom header requirements, Bearer vs Cookie policies).
- **Payment & Webhooks**: `server/tests/payment.test.js` (17 tests passed across SEC-05 raw-body buffer validation and backend-only mock payment flow; 12 live-DB dependent tests skipped without local MongoDB).
- **Transactional Outbox & Worker Reliability**: `server/tests/emailWorkerReliability.test.js` (21 tests passed), `server/tests/authEmailIntegration.test.js` (12 tests passed), `server/tests/orderEmailIntegration.test.js` (25 tests passed), and `server/tests/emailOutbox.test.js` (32 tests passed).
- **Administrative Operations & Governance**:
  - `server/tests/adminCoupon.test.js` (24 tests passed — coupon CRUD, limits, and safe cancellation release).
  - `server/tests/adminOrder.test.js` (16 tests passed — fulfillment state transitions and inventory safety).
  - `server/tests/adminCategory.test.js` (12 tests passed — category management and product link protection).
  - `server/tests/adminCustomer.test.js` (10 tests passed — account status toggles and admin self-protection).
  - `server/tests/adminInventory.test.js` (10 tests passed — stock adjustment safety and audit trail).
  - `server/tests/adminProduct.test.js` (9 tests passed — catalog operations, Cloudinary, and role guards).
  - `server/tests/adminAnalytics.test.js` (6 tests passed — KPI aggregation).

Over **428 automated tests** are verified across frontend and backend workspaces.

> [!IMPORTANT]
> **MongoDB Dependency & Test Execution Limitation**:
> - Integration test suites that establish direct database connections (`auth.test.js`, `cart.test.js`, `checkout.test.js`, `review.test.js`, `catalog.test.js`, `coupon.test.js`, `wishlist.test.js`, and `address.test.js`) require a running local MongoDB instance on `mongodb://localhost:27017` and fail with `ECONNREFUSED` if the MongoDB daemon is offline.
> - In contrast, 21 unit and mock-backed test suites (including `security.test.js`, `csrf.test.js`, `payment.test.js`, `emailWorkerReliability.test.js`, `orderEmailIntegration.test.js`, and all admin suites) mock database operations and execute completely independently of an active MongoDB daemon.

---

## Target Hosting Architecture

```
                                  [ User Browser ]
                                         │
                    ┌────────────────────┴────────────────────┐
                    │                                         │
                    ▼                                         ▼
         [ Frontend: Vercel ]                       [ Backend: Render ]
      Single Page Application (SPA)             Node.js / Express Web Service
      - Automatic Brotli/Gzip                   - Health Check: /api/v1/health
      - SPA Rewrites: vercel.json               - Blueprint: render.yaml
                    │                                         │
                    │                                         ├─► [ MongoDB Atlas ]
                    │                                         │   Replica Set Database
                    │                                         │
                    │                                         ├─► [ Cloudinary CDN ]
                    │                                         │   Image Optimization
                    │                                         │
                    ▼                                         ▼
            [ HTTPS / TLS ]                           [ Transactional Outbox ]
      Strict Origin Validation                        - Brevo API / Mock Transport
```

### Deployment Configuration Status

- **Configured in Repository**:
  - `render.yaml`: Infrastructure-as-code blueprint defining the Render web service, health check path (`/api/v1/health`), build commands, and environment mappings.
  - `client/vercel.json`: Single Page Application rewrite rules routing all client paths to `/index.html`.
  - `server/src/config/env.js`: Production startup validator requiring strong 32+ character secrets, blocking localhost database URIs in production, and validating required API keys.
- **Production Status**: **Target hosting configuration only.** No live production services are currently deployed.

---

## Screenshots

*Screenshots will be added following final storefront UI polish and theme completion.*

| View | Description | Preview |
| :--- | :--- | :--- |
| **Storefront Homepage** | Editorial hero section, curated categories, and featured lookbook | *[ Placeholder: Storefront Homepage ]* |
| **Product Detail Page** | Image gallery, variant selector, size matrix, and customer reviews | *[ Placeholder: Product Detail Page ]* |
| **Shopping Bag & Checkout** | Real-time calculation, address selector, coupon application, and payment | *[ Placeholder: Checkout Page ]* |
| **Admin Dashboard** | Revenue metrics, order queue, inventory alerts, and customer analytics | *[ Placeholder: Admin Dashboard ]* |
| **Order Tracking** | Customer order confirmation, status timeline, and item summaries | *[ Placeholder: Order Tracking ]* |

---

## Roadmap & Development Progress

- [x] Phase 1: Requirements, System Architecture & Design System
- [x] Phase 2: Monorepo Setup & Base Scaffolding
- [x] Phase 3: Backend REST API, Auth & Data Models
- [x] Phase 4: Product Catalog, Variant Matrix & Category Navigation
- [x] Phase 5: Customer Bag, Wishlist, Addresses & Reviews
- [x] Phase 6: Checkout, Pricing Engine, Razorpay & Webhook Hardening
- [x] Phase 7: Administrative Dashboard, Fulfillment & Customer Management
- [ ] Phase 8: Quality Assurance, Security Audits & Session Invalidation (In Progress)
- [ ] Phase 9: Live Production Onboarding (Production Gateway, Brevo DNS, Cloud Deployment)

---

## Author & Repository

- **Author**: Kiran Kishore ([@KiranKishore05](https://github.com/KiranKishore05))
- **GitHub Repository**: [https://github.com/KiranKishore05/ShopSphere](https://github.com/KiranKishore05/ShopSphere)
- **License**: ISC
