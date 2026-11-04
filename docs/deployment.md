# ShopSphere — Deployment & Operations Guide

**Project Name:** ShopSphere  
**Document:** Deployment Architecture, Environment Setup & Production Readiness  
**Version:** 1.0.0  

---

## 1. Hosting Architecture Overview

```
                      +-----------------------------+
                      |   Cloudflare / DNS & SSL    |
                      +--------------+--------------+
                                     |
               +---------------------+---------------------+
               |                                           |
               v                                           v
    +----------------------+                   +----------------------+
    | Frontend: Vercel     |                   | Backend: Render      |
    | Static SPA Hosting   |                   | Node.js Web Service  |
    | Automatic Brotli/Gzip|                   | Health Check Monitored|
    +----------------------+                   +-----------+----------+
                                                           |
                                      +--------------------+--------------------+
                                      |                                         |
                                      v                                         v
                           +----------------------+                  +----------------------+
                           | Database:            |                  | Assets:              |
                           | MongoDB Atlas Cluster|                  | Cloudinary CDN       |
                           | Auto-backups & Replica|                  | Global Edge Caching  |
                           +----------------------+                  +----------------------+
```

---

## 2. Environment Variables Specification

### 2.1 Frontend Environment Variables (`client/.env.example`)
```ini
# Base URL for backend REST API
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Razorpay Public Key ID (Safe for public browser exposure)
VITE_RAZORPAY_KEY_ID=rzp_test_placeholder

# Cloudinary Cloud Name (For direct image display optimization)
VITE_CLOUDINARY_CLOUD_NAME=shopsphere-fashion

# Brand Meta
VITE_APP_NAME=ShopSphere
```

### 2.2 Backend Environment Variables (`server/.env.example`)
```ini
# Server runtime environment
NODE_ENV=development
PORT=5000

# Client Application URL (For strict CORS whitelist & cookies)
CLIENT_ORIGIN=http://localhost:5173
APP_BASE_URL=http://localhost:5173

# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/shopsphere?retryWrites=true&w=majority

# JWT Authentication Secrets
JWT_SECRET=super_secret_jwt_passphrase_change_in_production_32chars
JWT_EXPIRES_IN=7d
COOKIE_SECRET=super_secret_cookie_signing_key_32chars

# Razorpay Payment Gateway Credentials (TEST MODE INITIAL)
RAZORPAY_KEY_ID=rzp_test_placeholder
RAZORPAY_KEY_SECRET=rzp_secret_placeholder
RAZORPAY_WEBHOOK_SECRET=rzp_webhook_secret_placeholder

# Cloudinary Media Management Credentials
CLOUDINARY_CLOUD_NAME=shopsphere-fashion
CLOUDINARY_API_KEY=placeholder_api_key
CLOUDINARY_API_SECRET=placeholder_api_secret

# Initial Store Administrator Bootstrap (Executed via secure CLI script only)
ADMIN_BOOTSTRAP_KEY=secure_one_time_bootstrap_token
```

---

## 3. Database Deployment & Atlas Security Checklist
1. **Network Access / IP Allowlist:**
   * Development: Configure current developer IP or standard development access.
   * Production (Render): Enable connection access via Atlas network rules or dedicated static outbound IP addresses.
2. **Database Authentication:**
   * Create a dedicated MongoDB user with least-privilege `readWrite` role scoped strictly to the `shopsphere` database.
3. **Index Pre-compilation:**
   * Run migration / schema synchronization script to ensure unique indexes (`email`, `slug`, `sku`, `orderNumber`) are built prior to live traffic.

---

## 4. Frontend Deployment on Vercel
1. Set framework preset to **Vite**.
2. Root directory: `client`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Single-Page Application (SPA) routing fallback:
   Create `client/vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
6. Set environment variables (`VITE_API_BASE_URL`, `VITE_RAZORPAY_KEY_ID`, `VITE_CLOUDINARY_CLOUD_NAME`).

---

## 5. Backend Deployment on Render
1. Environment: **Node.js**.
2. Root directory: `server`.
3. Build command: `npm install`.
4. Start command: `node src/server.js`.
5. Health check path: `/api/v1/health`.
6. Configure all backend environment variables in Render Dashboard Secret Store.
7. Ensure `SameSite: 'none'` and `Secure: true` are enabled when frontend and backend reside on separate subdomains.

---

## 6. Live Payment Gateway Handover Verification
Before transitioning Razorpay from `test` mode to `live` mode:
1. Verify business KYC and bank account activation in Razorpay Dashboard.
2. Switch `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to Live API Keys.
3. Configure the live Webhook URL in Razorpay Dashboard pointing to `https://api.shopsphere.com/api/v1/webhooks/razorpay` with event `payment.captured`.
4. Execute an end-to-end transaction with an actual payment method; verify receipt and immediate refund.

---

## 7. Cloudinary Media Asset Pipeline & Operations
1. **Credentials Management:**
   * `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` must reside strictly on the server backend.
   * Client applications only receive the public `cloud_name` or pre-transformed CDN asset URLs.
2. **Upload & Transformation Pipeline:**
   * Images uploaded via `/api/v1/admin/uploads/image` are processed via official Cloudinary v2 SDK into the folder `shopsphere/products`.
   * Automatic optimizations: `fetch_format: 'auto'` (WebP/AVIF delivery) and `quality: 'auto:eco'` with high-fashion portrait aspect ratio constraints.
3. **Resilience & Development Fallback:**
   * If credentials are unset or placeholder in local development, the service falls back gracefully to deterministic SVG/canvas luxury placeholders with verified dimensions, preventing server crashes.
   * Image deletion verifies public ID before triggering remote asset destruction.

---

## 8. Performance Optimization, Compression & Browser Caching

### 8.1 HTTP Payload Compression
* Backend implements `compression()` middleware on Express with Gzip / Deflate algorithm support.
* Filters out small payloads (`threshold: 1024` bytes) and honours `Cache-Control: no-transform` headers.
* Reduces JSON payload transfer overhead by 65–80% for large catalog queries and product suggestion responses.

### 8.2 Client-Side Route Code Splitting
* Uses `React.lazy()` and `Suspense` with an editorial skeleton fallback to split routes at the application boundary:
  * Public storefront index chunk: **210.30 kB** (gzip: 47.91 kB) — substantially below the 500 kB target.
  * Vendor libraries partitioned via `manualChunks`:
    * `vendor-react` (React, ReactDOM, React Router): 235.08 kB (gzip: 74.49 kB)
    * `vendor-data` (TanStack Query, Axios, Lucide Icons): 97.96 kB (gzip: 33.29 kB)
  * Administration dashboard routes are completely isolated in asynchronous sub-chunks (8 kB to 25 kB each) and never loaded on public storefront pages.
  * Checkout funnel is isolated in `CheckoutPage.js` (22.15 kB) and only downloaded when an authenticated customer begins checkout.

### 8.3 Browser Caching Headers
* Static assets emitted by Vite (`/assets/*`) include deterministic cryptographic content hashes in filenames.
* Recommended production reverse proxy / CDN caching headers:
  ```http
  # Immutable hashing for bundled scripts and styles
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # Revalidate HTML index for zero-downtime atomic rollouts
  location = /index.html {
    add_header Cache-Control "public, max-age=0, must-revalidate";
  }
  ```

---

## 9. SEO Implementation & Single-Page Application (SPA) Architectural Limitations

### 9.1 Storefront Dynamic Metadata
* Standardized `SEO.jsx` component dynamically updates the DOM document head for all catalog routes:
  * Dynamic `<title>` tags formatted as `{Title} — ShopSphere Luxury Fashion`.
  * Context-aware `<meta name="description">` extracted from real product descriptions and curated category text.
  * Self-referencing `<link rel="canonical">` URLs.
  * OpenGraph metadata (`og:title`, `og:description`, `og:url`, `og:image`, `og:site_name`, `og:type`).
  * Twitter Card metadata (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
* All metadata is generated exclusively from authenticated database products and categories, strictly avoiding fake ratings, prices, or speculative structured data.

### 9.2 Vite SPA Architectural Limitations & Commercial Indexing Roadmap
* **Current Limitation:** Because ShopSphere is architected as a Client-Side Rendered (CSR) Single-Page Application (SPA) using Vite and React, search engine crawlers that do not execute client-side JavaScript (or crawler bots with constrained render budgets) receive only the minimal HTML shell (`<div id="root"></div>`) with default fallback title/meta tags on initial HTTP GET.
* **Crawler Behavior:**
  * Modern Googlebot executes headless Chromium and will eventually index client-rendered content, but with an indexing delay and potential crawl budget penalty.
  * Social scrapers (Facebook OpenGraph scraper, Twitterbot, LinkedIn bot, WhatsApp, Pinterest) do **not** execute JavaScript; dynamic social preview cards will rely on edge server rendering.
* **Production Recommendation for Phase 9 / Scale:**
  1. **Edge Dynamic Prerendering:** Deploy edge middleware (e.g. Cloudflare Worker or Vercel Edge Middleware) using Prerender.io or Puppeteer to detect bot user-agents (`googlebot`, `facebookexternalhit`, `twitterbot`) and serve a cached, pre-rendered static HTML snapshot.
  2. **Migration to SSR / Hybrid Framework:** If high-velocity search indexing across thousands of seasonal garment SKUs is required, consider evaluating a migration to Remix or Next.js for server-rendered product and collection pages while maintaining the current API and design system.
