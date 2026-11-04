# ShopSphere — Testing & Quality Assurance Strategy

**Project Name:** ShopSphere  
**Document:** Testing Architecture, Test Suites & Verification Protocol  
**Version:** 1.0.0  

---

## 1. Testing Philosophy & Test Pyramid

ShopSphere employs a test pyramid combining unit tests, integration tests, and end-to-end integration flows to ensure stability, financial correctness, and inventory precision.

```
       / \
      / E2E \       Critical Path Flows (Registration, Checkout, Payment Signature)
     /-------\
    / Integration \  API Controllers, Service Layer, Razorpay Verification, Database Transactions
   /---------------\
  /   Unit Tests    \ Pure Utilities, Zod Schema Validators, Price/Discount Calculations, State Machines
 /-------------------\
```

---

## 2. Test Suites & Tooling

| Tier | Target Layer | Tooling | Focus Areas |
| :--- | :--- | :--- | :--- |
| **Backend API Tests** | Controllers & Routes | Vitest / Jest + Supertest | HTTP response codes, Zod schema validation errors, rate limits, cookie authentication, route guards. |
| **Backend Services** | Services & Transactions | Vitest + In-Memory / Test DB | Stock deduction atomicity, coupon redemption validation, HMAC SHA256 signature verification, inventory ledger logs. |
| **Frontend Unit / Integration** | Components & Hooks | Vitest + React Testing Library | Form validations, variant selection state, price display formatting, cart quantity stepper, protected route redirects. |
| **Linting & Code Standards** | Monorepo codebase | ESLint + Prettier | Syntax correctness, unused variables, styling consistency, security rule checks. |

---

## 3. Mandatory Automated Test Scenarios

### 3.1 Authentication & Authorization
* `TEST-AUTH-01`: Customer registration succeeds with valid credentials, hashes password, and sets HTTP-only cookie.
* `TEST-AUTH-02`: Registration rejects duplicate email with HTTP `409 Conflict`.
* `TEST-AUTH-03`: Registration rejects weak password (< 8 chars, lacking complexity) with HTTP `400 Validation Error`.
* `TEST-AUTH-04`: Login succeeds with correct credentials and rejects invalid password without disclosing email existence.
* `TEST-AUTH-05`: Protected routes (`/account/*`, `/cart`) reject unauthenticated requests with HTTP `401 Unauthorized`.
* `TEST-AUTH-06`: Admin routes (`/admin/*`) reject authenticated customer requests with HTTP `403 Forbidden`.

### 3.2 Catalog & Product Variant Matrix
* `TEST-CAT-01`: Product creation generates unique slug and assigns unique SKUs to variants.
* `TEST-CAT-02`: Rejects product creation if duplicate SKU is detected within the catalog.
* `TEST-CAT-03`: Search query matches across title, tags, and brand.
* `TEST-CAT-04`: Faceted filters return correct subset matching category, gender, size, and price range.
* `TEST-CAT-05`: Out-of-stock variant exhibits `stockQuantity: 0` and is flagged as unavailable for checkout.

### 3.3 Cart, Pricing & Coupon Engine
* `TEST-CART-01`: Adding variant increments cart line item count up to available inventory limit.
* `TEST-CART-02`: Subtotal accurately calculates $\sum(\text{price} \times \text{quantity})$ on the server.
* `TEST-CART-03`: Coupon validation verifies active status, start/end dates, and minimum order spend.
* `TEST-CART-04`: Percentage coupon with max cap applies correct discount ceiling.
* `TEST-CART-05`: Expired coupon or exceeding max usage limit is rejected with informative error.

### 3.4 Checkout, Razorpay Verification & Inventory Atomic Locking
* `TEST-ORD-01`: Order placement atomically reduces variant inventory by ordered quantities.
* `TEST-ORD-02`: Concurrent checkout simulation prevents overselling when available stock is 1 and 2 requests arrive simultaneously.
* `TEST-ORD-03`: Razorpay HMAC SHA256 signature verification succeeds with legitimate payload and fails with forged signature.
* `TEST-ORD-04`: Order cancellation releases inventory back to product variants and creates `InventoryMovement` record.
* `TEST-ORD-05`: Webhook handler processes `payment.captured` event idempotently.

### 3.5 Product Reviews, Ratings, Search & Performance Optimization (Phase 8)
* `TEST-REV-01`: Only authenticated customers with a `delivered` order containing the product can submit a verified review.
* `TEST-REV-02`: Customers with unpurchased or undelivered products receive HTTP `400` (`REVIEW_ELIGIBILITY_FAILED`).
* `TEST-REV-03`: Duplicate review attempts by the same customer on the same product are rejected with HTTP `409` (`DUPLICATE_REVIEW`).
* `TEST-REV-04`: Customers can edit and delete only their own reviews; cross-user modification is rejected with HTTP `403` (`FORBIDDEN`).
* `TEST-REV-05`: Product `averageRating` and `reviewCount` are recalculated atomically upon review creation, edit, deletion, and moderation.
* `TEST-REV-06`: Admin moderation queue permits filtering by status (`pending`, `approved`, `rejected`) and rating score (`1`–`5`).
* `TEST-REV-07`: Admin can approve, feature, and delete reviews safely using existing admin authorization middleware.
* `TEST-SRCH-01`: Full-text MongoDB search matches queries against product title, description, brand, and category tags.
* `TEST-SRCH-02`: Search suggestions endpoint `/api/v1/products/search/suggestions` returns matching products, categories, and total counts.
* `TEST-SRCH-03`: Storefront autocomplete supports debounced live typing and keyboard navigation.
* `TEST-PERF-01`: Route-level code splitting using `React.lazy` and `Suspense` isolates admin and checkout components from public bundle.
* `TEST-PERF-02`: Production build initial index JavaScript bundle is maintained well under the 500 kB threshold (achieved: 210.3 kB, gzip: 47.9 kB).

---

## 4. Test Execution Status & Monorepo Coverage

| Suite | File / Scope | Passing Tests | Status |
| :--- | :--- | :--- | :--- |
| **Server Admin Suite** | `server/tests/admin.test.js` | 27 / 27 | PASS |
| **Server Review & Search Suite** | `server/tests/review.test.js` | 20 / 20 | PASS |
| **Server Checkout Suite** | `server/tests/checkout.test.js` | 10 / 10 | PASS |
| **Server Payment & Razorpay Suite** | `server/tests/payment.test.js` | 9 / 9 | PASS |
| **Server Cart Suite** | `server/tests/cart.test.js` | 13 / 13 | PASS |
| **Server Coupon Suite** | `server/tests/coupon.test.js` | 9 / 9 | PASS |
| **Server Catalog Suite** | `server/tests/catalog.test.js` | 13 / 13 | PASS |
| **Server Auth Suite** | `server/tests/auth.test.js` | 13 / 13 | PASS |
| **Server Address Suite** | `server/tests/address.test.js` | 9 / 9 | PASS |
| **Server Wishlist Suite** | `server/tests/wishlist.test.js` | 9 / 9 | PASS |
| **Server Models & Ledger Suite** | `server/tests/models.test.js` | 7 / 7 | PASS |
| **Server Health Suite** | `server/tests/health.test.js` | 4 / 4 | PASS |
| **Client Review & Search Suite** | `client/src/pages/Reviews.test.jsx` | 10 / 10 | PASS |
| **Client Admin Suite** | `client/src/pages/admin/Admin.test.jsx` | 9 / 9 | PASS |
| **Client Catalog & Discovery Suite** | `client/src/pages/Catalog.test.jsx` | 7 / 7 | PASS |
| **Client Auth Suite** | `client/src/pages/Auth.test.jsx` | 7 / 7 | PASS |
| **Client Account & Address Suite** | `client/src/pages/Account.test.jsx` | 6 / 6 | PASS |
| **Client Cart Suite** | `client/src/pages/Cart.test.jsx` | 5 / 5 | PASS |
| **Client Checkout Suite** | `client/src/pages/Checkout.test.jsx` | 5 / 5 | PASS |
| **Client Orders Suite** | `client/src/pages/Orders.test.jsx` | 4 / 4 | PASS |
| **Client Wishlist Suite** | `client/src/pages/Wishlist.test.jsx` | 4 / 4 | PASS |
| **Client Shell & Routing Suite** | `client/src/App.test.jsx` | 4 / 4 | PASS |
| **TOTAL MONOREPO TESTS** | **22 Test Files** | **204 / 204** | **100% PASS** |

---

## 5. Test Execution Protocol

```bash
# Run all backend tests
cd server && npm test

# Run all frontend tests
cd client && npm test -- --run

# Run production build and bundle audit
cd client && npm run build
```
