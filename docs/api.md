# ShopSphere — RESTful API Specification

**Base URL:** `http://localhost:5000/api/v1` (Development) / `https://api.shopsphere.com/api/v1` (Production)  
**Specification Version:** 1.0.0  
**Data Format:** JSON (`application/json`)  
**Authentication Scheme:** Cookie-based JWT (`token` stored in HTTP-only, secure cookie) or Authorization Bearer header fallback.

---

## 1. Unified Response Envelope

All API endpoints return a standardized JSON structure.

### Success Envelope
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

### Error Envelope
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Variant SKU 'SHIRT-BLK-M' has only 1 unit remaining in stock",
    "details": [
      {
        "field": "quantity",
        "issue": "Requested quantity exceeds available stock"
      }
    ]
  }
}
```

---

## 2. Standard HTTP Status Codes & Error Code Registry

| HTTP Code | Error Code | Description |
| :--- | :--- | :--- |
| `400` | `VALIDATION_ERROR` | Request payload failed Zod schema validation. |
| `400` | `INVALID_CREDENTIALS` | Incorrect email or password during login. |
| `400` | `INVALID_COUPON` | Coupon does not exist, has expired, or minimum spend is unmet. |
| `400` | `REVIEW_ELIGIBILITY_FAILED` | User is not eligible to review (requires a delivered order containing this product). |
| `401` | `UNAUTHORIZED` | Missing, expired, or tampered authentication token. |
| `403` | `FORBIDDEN` | Authenticated user lacks permission (e.g. non-admin accessing admin route, or modifying another user's review). |
| `404` | `RESOURCE_NOT_FOUND` | The requested product, category, order, or user does not exist. |
| `409` | `RESOURCE_CONFLICT` | Duplicate unique key collision (e.g., email or SKU already exists). |
| `409` | `DUPLICATE_REVIEW` | Customer has already submitted a review for this product. |
| `422` | `INSUFFICIENT_STOCK` | Variant stock is less than requested quantity at checkout. |
| `400` | `PAYMENT_VERIFICATION_FAILED` | Cryptographic HMAC SHA256 signature verification failed. |
| `429` | `RATE_LIMIT_EXCEEDED` | Request threshold exceeded; client must wait before retrying. |
| `500` | `INTERNAL_SERVER_ERROR` | Unhandled server error (stack trace concealed in production). |

---

## 3. Authentication Endpoints

### 3.1 Register Customer
* **Path:** `POST /api/v1/auth/register`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "name": "Aria Montgomery",
    "email": "aria.montgomery@example.com",
    "password": "SecurePassword123!",
    "phone": "+919876543210"
  }
  ```
* **Success Response (201 Created):**
  Sets `token` HTTP-only cookie.
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "_id": "6541f92a10b...",
        "name": "Aria Montgomery",
        "email": "aria.montgomery@example.com",
        "role": "customer",
        "phone": "+919876543210",
        "createdAt": "2026-10-27T19:00:00.000Z"
      }
    }
  }
  ```

### 3.2 Login User
* **Path:** `POST /api/v1/auth/login`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "email": "aria.montgomery@example.com",
    "password": "SecurePassword123!"
  }
  ```
* **Success Response (200 OK):**
  Sets `token` HTTP-only cookie.
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "_id": "6541f92a10b...",
        "name": "Aria Montgomery",
        "email": "aria.montgomery@example.com",
        "role": "customer"
      }
    }
  }
  ```

### 3.3 Logout User
* **Path:** `POST /api/v1/auth/logout`
* **Access:** Authenticated
* **Success Response (200 OK):**
  Clears the `token` cookie.
  ```json
  {
    "success": true,
    "data": { "message": "Successfully logged out" }
  }
  ```

### 3.4 Get Current Authenticated Profile
* **Path:** `GET /api/v1/auth/me`
* **Access:** Authenticated
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "user": {
        "_id": "6541f92a10b...",
        "name": "Aria Montgomery",
        "email": "aria.montgomery@example.com",
        "role": "customer",
        "savedAddresses": [],
        "wishlist": []
      }
    }
  }
  ```

### 3.5 Forgot Password
* **Path:** `POST /api/v1/auth/forgot-password`
* **Access:** Public
* **Request Body:** `{ "email": "aria.montgomery@example.com" }`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "If that email exists in our records, a reset link has been dispatched." }
  }
  ```

### 3.6 Reset Password
* **Path:** `POST /api/v1/auth/reset-password`
* **Access:** Public
* **Request Body:**
  ```json
  {
    "token": "4a719d30fbc...",
    "newPassword": "NewSecurePassword456!"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": { "message": "Password successfully updated." }
  }
  ```

---

## 4. Customer Profile & Address Book Endpoints

### 4.1 Update Profile
* **Path:** `PATCH /api/v1/users/me`
* **Access:** Authenticated (`customer`, `admin`)
* **Request Body:** `{ "name": "Aria M. Hastings", "phone": "+919876543219" }`
* **Success Response (200 OK):** Returns updated user object.

### 4.2 List Saved Addresses
* **Path:** `GET /api/v1/users/me/addresses`
* **Access:** Authenticated
* **Success Response (200 OK):** Returns array of saved addresses.

### 4.3 Add New Address
* **Path:** `POST /api/v1/users/me/addresses`
* **Access:** Authenticated
* **Request Body:**
  ```json
  {
    "fullName": "Aria Montgomery",
    "phone": "+919876543210",
    "streetAddress": "742 Evergreen Terrace",
    "apartment": "Apt 4B",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India",
    "isDefault": true
  }
  ```
* **Success Response (201 Created):** Returns created address with generated `_id`.

### 4.4 Update Saved Address
* **Path:** `PATCH /api/v1/users/me/addresses/:addressId`
* **Access:** Authenticated
* **Request Body:** Partial address fields to update.
* **Success Response (200 OK):** Returns updated address list.

### 4.5 Delete Saved Address
* **Path:** `DELETE /api/v1/users/me/addresses/:addressId`
* **Access:** Authenticated
* **Success Response (200 OK):** Returns updated address list.

---

## 5. Catalog Endpoints

### 5.1 List & Search Products
* **Path:** `GET /api/v1/products`
* **Access:** Public
* **Query Parameters:**
  * `search`: Free text search string
  * `category`: Category slug or ID
  * `gender`: `men` | `women` | `unisex`
  * `size`: Array or comma-delimited list of sizes (e.g. `S,M,L`)
  * `color`: Color name or hex
  * `minPrice`: Minimum price filter
  * `maxPrice`: Maximum price filter
  * `inStock`: `true` | `false`
  * `sort`: `newest` | `price_asc` | `price_desc` | `popular` | `rating` | `relevance`
  * `page`: Integer (default 1)
  * `limit`: Integer (default 12, max 50)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "products": [
        {
          "_id": "654201b...",
          "name": "Oversized Cashmere Overcoat",
          "slug": "oversized-cashmere-overcoat",
          "brand": "Atelier Sphere",
          "gender": "unisex",
          "category": { "name": "Outerwear", "slug": "outerwear" },
          "images": [{ "url": "https://...", "isPrimary": true }],
          "priceRange": { "min": 14999, "max": 14999 },
          "availableSizes": ["S", "M", "L"],
          "availableColors": [{ "name": "Camel", "hexCode": "#C19A6B" }],
          "isFeatured": true,
          "averageRating": 4.8,
          "reviewCount": 14
        }
      ]
    },
    "meta": { "page": 1, "limit": 12, "total": 48, "totalPages": 4 }
  }
  ```

### 5.2 Get Search Suggestions & Autocomplete
* **Path:** `GET /api/v1/products/search/suggestions`
* **Access:** Public
* **Query Parameters:**
  * `q`: Search query prefix or keywords (e.g. `cash`)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "products": [
        {
          "_id": "654201b...",
          "name": "Oversized Cashmere Overcoat",
          "slug": "oversized-cashmere-overcoat",
          "brand": "Atelier Sphere",
          "category": { "name": "Outerwear", "slug": "outerwear" },
          "image": "https://...",
          "price": 14999,
          "averageRating": 4.8
        }
      ],
      "categories": [
        {
          "_id": "cat-1",
          "name": "Outerwear",
          "slug": "outerwear",
          "productCount": 18
        }
      ],
      "totalCount": 6
    }
  }
  ```

### 5.3 Get Product Details by Slug
* **Path:** `GET /api/v1/products/:slug`
* **Access:** Public
* **Success Response (200 OK):** Complete product document including full variant matrix and stock counts.

### 5.4 List Categories
* **Path:** `GET /api/v1/categories`
* **Access:** Public
* **Success Response (200 OK):** Array of active categories with images and product counts.

### 5.5 Get Products by Category Slug
* **Path:** `GET /api/v1/categories/:slug/products`
* **Access:** Public
* **Query Parameters:** Same filtering/sorting parameters as `GET /api/v1/products`.

### 5.6 Product Reviews Integration
* Product reviews and rating submission are documented in **Section 10: Product Reviews & Ratings Endpoints**.
* Product list and detail responses automatically include cached `averageRating` (rounded to 1 decimal place) and `reviewCount`.

---

## 6. Shopping Bag & Wishlist Endpoints

### 6.1 Get Shopping Cart
* **Path:** `GET /api/v1/cart`
* **Access:** Authenticated Customer (or session cart for guests)
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "items": [
        {
          "productId": "654201b...",
          "variantSku": "COAT-CAMEL-M",
          "name": "Oversized Cashmere Overcoat",
          "size": "M",
          "color": { "name": "Camel", "hexCode": "#C19A6B" },
          "image": "https://...",
          "unitPrice": 14999,
          "quantity": 1,
          "availableStock": 4,
          "lineTotal": 14999
        }
      ],
      "subtotal": 14999,
      "itemCount": 1
    }
  }
  ```

### 6.2 Add Item to Cart
* **Path:** `POST /api/v1/cart/items`
* **Access:** Authenticated
* **Request Body:**
  ```json
  {
    "productId": "654201b...",
    "variantSku": "COAT-CAMEL-M",
    "quantity": 1
  }
  ```
* **Success Response (200 OK):** Returns updated cart.

### 6.3 Update Cart Item Quantity
* **Path:** `PATCH /api/v1/cart/items/:itemSku`
* **Access:** Authenticated
* **Request Body:** `{ "quantity": 2 }`
* **Success Response (200 OK):** Returns updated cart with recalculated totals.

### 6.4 Remove Item from Cart
* **Path:** `DELETE /api/v1/cart/items/:itemSku`
* **Access:** Authenticated
* **Success Response (200 OK):** Returns updated cart.

### 6.5 Wishlist Operations
* `GET /api/v1/wishlist` — List saved wishlist products.
* `POST /api/v1/wishlist/items` — Add product to wishlist `{ "productId": "..." }`.
* `DELETE /api/v1/wishlist/items/:productId` — Remove product from wishlist.

---

## 7. Checkout & Order Endpoints

### 7.1 Validate Coupon Code
* **Path:** `POST /api/v1/coupons/validate`
* **Access:** Authenticated Customer
* **Request Body:** `{ "code": "SPHERE10", "subtotal": 14999 }`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "code": "SPHERE10",
      "discountType": "percentage",
      "discountValue": 10,
      "discountAmount": 1500,
      "message": "10% discount applied successfully."
    }
  }
  ```

### 7.2 Get Authoritative Checkout Quote
* **Path:** `POST /api/v1/checkout/quote`
* **Access:** Authenticated Customer
* **Request Body:**
  ```json
  {
    "shippingAddress": { "postalCode": "400001", "state": "Maharashtra" },
    "couponCode": "SPHERE10"
  }
  ```
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "subtotal": 14999,
      "discount": 1500,
      "shippingFee": 0,
      "tax": 1620,
      "grandTotal": 15119
    }
  }
  ```

### 7.3 Checkout & Order Creation
* **Path:** `POST /api/v1/orders/checkout`
* **Access:** Authenticated Customer
* **Headers:** `Idempotency-Key: <unique_string>` (optional header or in body)
* **Request Body:**
  ```json
  {
    "addressId": "65421a...",
    "paymentMethod": "razorpay",
    "couponCode": "SPHERE10",
    "idempotencyKey": "idem_12345678"
  }
  ```
  *(Alternatively, an inline `shippingAddress` object can be provided instead of `addressId`).*
* **Success Response (201 Created):**
  Returns server-authoritative order calculation with immutable product & address snapshots and tracking number (`SPH-...`).

### 7.4 List Customer Orders
* **Path:** `GET /api/v1/orders/me`
* **Access:** Authenticated Customer
* **Query Parameters:** `page`, `limit`
* **Success Response (200 OK):** Paginated array of customer orders.

### 7.5 Get Customer Order By Order Number
* **Path:** `GET /api/v1/orders/me/:orderNumber`
* **Access:** Authenticated Customer (ownership strictly enforced)
* **Success Response (200 OK):** Full order details, items snapshot, shipping address, status timeline.

### 7.6 Customer Order Cancellation
* **Path:** `PATCH /api/v1/orders/me/:orderNumber/cancel`
* **Access:** Authenticated Customer (only if `pending_payment` or `confirmed`)
* **Request Body:** `{ "reason": "Change of delivery preference" }`
* **Success Response (200 OK):** Order marked `cancelled`, inventory atomically restored to catalogue.

---

## 8. Promotions & Coupons

### 8.1 Apply Coupon
* **Path:** `POST /api/v1/coupons/apply`
* **Access:** Authenticated Customer
* **Request Body:**
  ```json
  {
    "code": "WELCOME10",
    "subtotal": 12000
  }
  ```
* **Success Response (200 OK):** Returns validated discount amount and discounted subtotal.

---

## 9. Payment & Razorpay Endpoints

### 9.1 Create Razorpay Order
* **Path:** `POST /api/v1/payments/razorpay/create-order`
* **Access:** Authenticated Customer
* **Request Body:** `{ "orderId": "65421a..." }`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "razorpayOrderId": "order_NXg98k21HkZ",
      "amount": 1080000,
      "currency": "INR",
      "keyId": "rzp_test_YourKeyHere",
      "orderNumber": "SPH-L8B1Z9-A4F2"
    }
  }
  ```

### 9.2 Verify Razorpay Signature
* **Path:** `POST /api/v1/payments/razorpay/verify`
* **Access:** Authenticated Customer
* **Request Body:**
  ```json
  {
    "orderId": "65421a...",
    "razorpayOrderId": "order_NXg98k21HkZ",
    "razorpayPaymentId": "pay_NXgA12984k",
    "razorpaySignature": "9bf2e783a48e91024bc..."
  }
  ```
* **Success Response (200 OK):**
  HMAC SHA-256 timing-safe verification, atomic inventory deduction, and transitions `orderStatus` to `confirmed` and `paymentStatus` to `paid`.

### 9.3 Razorpay Webhook Handler
* **Path:** `POST /api/v1/payments/razorpay/webhook`
* **Access:** Public (Protected by timing-safe `x-razorpay-signature` verification against raw payload buffer)
* **Supported Events:** `payment.captured`, `payment.failed`
* **Success Response (200 OK):** `{ "status": "ok" }`

---

## 9. Administrative Endpoints (`role === 'admin'`)

### 9.1 Product Administration
* `GET /api/v1/admin/products` — Paginated product catalog with filters (`page`, `limit`, `search`, `category`, `gender`, `stock`, `isActive`).
* `POST /api/v1/admin/products` — Create garment with variant matrix and initial inventory movements.
* `POST /api/v1/admin/products/upload-image` — Cloudinary image upload with automatic placeholder fallback.
* `GET /api/v1/admin/products/:id` — Retrieve full product details including variants and category.
* `PATCH /api/v1/admin/products/:id` — Update garment attributes, pricing, variants, and stock.
* `DELETE /api/v1/admin/products/:id` — Deactivate / archive garment from public catalog.

### 9.2 Category Administration
* `GET /api/v1/admin/categories` — Complete category taxonomy with product count aggregation.
* `POST /api/v1/admin/categories` — Create category `{ "name", "slug", "description", "image" }`.
* `GET /api/v1/admin/categories/:id` — Retrieve single category details.
* `PATCH /api/v1/admin/categories/:id` — Update category metadata and active state.
* `DELETE /api/v1/admin/categories/:id` — Remove category (blocked if active products reference it).

### 9.3 Inventory & Warehouse Auditing
* `GET /api/v1/admin/inventory` — Variant-level stock overview with `isLowStock` indicator and search.
* `POST /api/v1/admin/inventory/adjust` — Atomic stock adjustment requiring mandatory reason (`restock`, `damaged_writeoff`, `manual_adjustment`) and creating an immutable `InventoryMovement` record.
* `GET /api/v1/admin/inventory/movements` — Paginated immutable inventory movement audit trail.

### 9.4 Order Fulfillment Administration
* `GET /api/v1/admin/orders` — Orders fulfillment queue with status and payment filters.
* `GET /api/v1/admin/orders/:id` — Complete order fulfillment dossier.
* `PATCH /api/v1/admin/orders/:id/status` — Validated status transitions (`confirmed` -> `processing` -> `shipped` -> `delivered`), recording carrier, tracking number, admin attribution, and automatic inventory rollback on cancellation.

### 9.5 Promotion & Coupon Administration
* `GET /api/v1/admin/coupons` — Complete coupon listing with redemption counters.
* `POST /api/v1/admin/coupons` — Create promotional coupon rule.
* `GET /api/v1/admin/coupons/:id` — Retrieve single coupon rule.
* `PATCH /api/v1/admin/coupons/:id` — Update coupon dates, discounts, quotas, or toggle active state.
* `DELETE /api/v1/admin/coupons/:id` — Revoke coupon voucher.

### 9.6 Analytics & Reporting
* `GET /api/v1/admin/analytics/summary` — Aggregated revenue metrics from paid/active orders, day-by-day revenue progression, order status breakdown, top-selling garments, and low-stock alerts. Supports `period` (`7d`, `30d`, `90d`, `all`).

### 9.7 Review Moderation & Content Safety
* `GET /api/v1/admin/reviews` — Paginated moderation queue with status filter (`pending`, `approved`, `rejected`), rating filter (`1`–`5`), and search. Returns total count and status breakdown metrics (`pending`, `approved`, `rejected`).
* `PATCH /api/v1/admin/reviews/:id/moderation` — Moderate review status (`pending`, `approved`, `rejected`) and featured flag (`isFeatured: boolean`). Automatically triggers atomic product rating and review count recalculation.
* `DELETE /api/v1/admin/reviews/:id` — Permanently delete abusive review from database and automatically recalculate product average rating and count.

---

## 10. Customer Product Reviews & Ratings Endpoints

### 10.1 List Product Reviews & Summary
* **Path:** `GET /api/v1/reviews/:productId` or `GET /api/v1/products/:productId/reviews`
* **Access:** Public
* **Query Parameters:**
  * `page`: Integer (default 1)
  * `limit`: Integer (default 10, max 50)
  * `sort`: `newest` (default) | `rating_desc` | `rating_asc`
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "reviews": [
        {
          "_id": "6724...",
          "rating": 5,
          "title": "Superb craftsmanship",
          "comment": "The wool drape and seam quality exceed expectations.",
          "isVerifiedPurchase": true,
          "isFeatured": true,
          "user": {
            "_id": "6720...",
            "name": "Evelyn Reed"
          },
          "createdAt": "2026-11-01T14:00:00.000Z"
        }
      ],
      "summary": {
        "averageRating": 4.8,
        "totalReviews": 1,
        "distribution": { "1": 0, "2": 0, "3": 0, "4": 0, "5": 1 }
      }
    },
    "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
  }
  ```

### 10.2 Check Review Eligibility
* **Path:** `GET /api/v1/reviews/eligibility/:productId`
* **Access:** Authenticated Customer
* **Behavior:** Checks MongoDB orders collection for `orderStatus === 'delivered'` containing `productId`. Also checks if the customer has already submitted a review.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "data": {
      "isEligible": true,
      "hasReviewed": false,
      "orderId": "6723..."
    }
  }
  ```

### 10.3 Submit Product Review
* **Path:** `POST /api/v1/reviews`
* **Access:** Authenticated Customer
* **Validation:**
  * Requires valid JWT cookie.
  * Server-enforces delivered order verification (`REVIEW_ELIGIBILITY_FAILED` if not delivered).
  * Compound index `{ productId, userId }` prevents duplicates (`DUPLICATE_REVIEW` if already reviewed).
* **Request Body:**
  ```json
  {
    "productId": "6721...",
    "rating": 5,
    "title": "Exceptional fit and feel",
    "comment": "Structured yet remarkably soft. True to size."
  }
  ```
* **Success Response (201 Created):** Returns created review document and recalculates `Product.averageRating` and `Product.reviewCount`.

### 10.4 Update Customer Review
* **Path:** `PATCH /api/v1/reviews/:id`
* **Access:** Authenticated Customer (Author only)
* **Validation:** Rejects attempts by other users with `403 Forbidden`. Recalculates product average rating if rating score is changed.
* **Request Body:**
  ```json
  {
    "rating": 4,
    "title": "Updated review title",
    "comment": "Updated review content after a few weeks of wear."
  }
  ```
* **Success Response (200 OK):** Returns updated review.

### 10.5 Delete Customer Review
* **Path:** `DELETE /api/v1/reviews/:id`
* **Access:** Authenticated Customer (Author or Admin)
* **Success Response (200 OK):** Deletes review and triggers atomic product rating recalculation.

---

## 11. System Health Endpoint

* **Path:** `GET /api/v1/health`
* **Access:** Public
* **Success Response (200 OK):**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-10-27T19:20:00.000Z",
    "uptime": 12480,
    "database": "connected",
    "services": {
      "razorpay": "configured",
      "cloudinary": "configured"
    }
  }
  ```
