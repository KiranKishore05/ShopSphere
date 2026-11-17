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

# Transactional Email Infrastructure (Phase 9 Stage 3)
EMAIL_PROVIDER=mock
EMAIL_FROM_ADDRESS=orders@shopsphere.in
EMAIL_FROM_NAME=ShopSphere
EMAIL_SUPPORT_ADDRESS=support@shopsphere.in
ADMIN_NOTIFICATION_EMAIL=admin@shopsphere.in
BREVO_API_KEY=xkeysib-placeholder-brevo-api-key
EMAIL_TOKEN_SECRET=your_32_character_email_token_secret_key_here
EMAIL_WORKER_ENABLED=true
EMAIL_MAX_RETRIES=5
EMAIL_RETRY_DELAY_MS=1000
EMAIL_POLL_INTERVAL_MS=10000
EMAIL_BATCH_SIZE=5
EMAIL_PROCESSING_LEASE_MS=300000
```

### 2.3 Production Environment Security Rules & Secret Generation
1. **Secret Generation Standard:**
   Production `JWT_SECRET`, `COOKIE_SECRET`, and `EMAIL_TOKEN_SECRET` must each be a minimum of 32 cryptographically random characters:
   ```bash
   # Generate 64-character hexadecimal key:
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   # or with OpenSSL:
   openssl rand -hex 32
   ```
2. **Production Startup Validation (`server/src/config/env.js`):**
   * When `NODE_ENV === 'production'`, the server verifies `JWT_SECRET`, `COOKIE_SECRET`, `EMAIL_TOKEN_SECRET`, and `MONGODB_URI` without fallback defaults.
   * If any secret is missing, less than 32 characters, contains `dev_` or `placeholder`, or if `MONGODB_URI` points to `localhost`, startup is aborted immediately with a sanitized error.
   * When `NODE_ENV === 'production'`, `EMAIL_PROVIDER` must be set to `'brevo'` (the `'mock'` adapter is strictly prohibited in production), and a non-empty `BREVO_API_KEY` must be configured.
3. **Session Cookie Security Policy:**
   * In production (`NODE_ENV === 'production'`), authentication cookies are issued with:
     * `httpOnly: true` (prevents client JavaScript / XSS access).
     * `secure: true` (requires HTTPS transmission).
     * `sameSite: 'none'` (permits cross-subdomain API calls between Vercel and Render).
     * `path: '/'` with explicit `maxAge: 7 days`.
   * On logout, cookies are expired immediately via `maxAge: 0` and `expires: new Date(0)`.

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
   Configured in `client/vercel.json`:
   ```json
   {
     "rewrites": [
       { "source": "/(.*)", "destination": "/index.html" }
     ]
   }
   ```
   Ensures deep links (`/shop`, `/account/orders`, `/admin/*`) resolve to `/index.html` without 404 errors.
6. Set environment variables (`VITE_API_BASE_URL`, `VITE_RAZORPAY_KEY_ID`, `VITE_CLOUDINARY_CLOUD_NAME`).

---

## 5. Backend Deployment on Render
1. Environment: **Node.js**.
2. Root directory: `server`.
3. Build command: `npm install`.
4. Start command: `node src/server.js`.
5. Health check path: `/api/v1/health`.
6. Infrastructure as Code: Root `render.yaml` blueprint defines the web service, build/start commands, and environment variable references.
7. Reverse Proxy & Rate Limiting: `app.set('trust proxy', 1)` is enabled by default to ensure Express and `express-rate-limit` read real client IPs through Render's reverse proxy/load balancer rather than internal proxy IPs.
8. CORS Multi-Origin Policy:
   - Configured via `CLIENT_ORIGIN` and `ALLOWED_ORIGINS` (comma-separated).
   - Strict pattern support for project Vercel previews: `^https:\/\/shopsphere(-[a-zA-Z0-9_-]+)*\.vercel\.app$`.
   - Local dev origins (`http://localhost:5173`, `http://127.0.0.1:5173`, `http://localhost:4173`) are preserved.
   - Non-matching external origins are safely rejected without throwing 500 errors.
9. Configure all backend environment variables in Render Dashboard Secret Store.
10. Ensure `SameSite: 'none'` and `Secure: true` are enabled when frontend and backend reside on separate subdomains.

---

## 6. Live Payment Gateway Handover Verification
Before transitioning Razorpay from `test` mode to `live` mode:
1. Verify business KYC and bank account activation in Razorpay Dashboard.
2. Switch `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` to Live API Keys.
3. Configure the live Webhook URL in Razorpay Dashboard pointing to `https://api.shopsphere.com/api/v1/payments/webhook` with events `payment.captured`, `order.paid`, and `payment.failed`.
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

---

## 10. Transactional Email System Production Deployment & DNS Setup Guide

### 10.1 Backend Environment Variables for Render

The transactional email engine is configured through environment variables in the Render Dashboard Secret Store.

#### Required Production Variables
| Variable Name | Production Validation Rule | Source / Description |
| :--- | :--- | :--- |
| `EMAIL_PROVIDER` | Must be strictly `'brevo'`. `'mock'` is prohibited in production. | Render Dashboard setting. |
| `BREVO_API_KEY` | Required, non-empty, cannot be placeholder (`xkeysib-...`). | Brevo Dashboard -> SMTP & API -> API Keys. |
| `EMAIL_TOKEN_SECRET` | Required, min 32 characters, no `dev_` or `placeholder`. | Generated via `openssl rand -hex 32` or Node crypto. Used for AES-256-GCM encryption of in-flight tokens. |
| `EMAIL_FROM_ADDRESS` | Valid email format (e.g. `orders@shopsphere.in`). | Verified sender domain in Brevo. |
| `EMAIL_SUPPORT_ADDRESS` | Valid email format (e.g. `support@shopsphere.in`). | Concierge support mailbox in email templates. |

#### Optional Operational Variables
| Variable Name | Default Value | Description |
| :--- | :--- | :--- |
| `EMAIL_FROM_NAME` | `ShopSphere` | Sender display name shown in email client inboxes. |
| `ADMIN_NOTIFICATION_EMAIL` | `""` (Empty string) | Administrative operational alerts recipient. If empty, admin alerts are safely bypassed without error. |
| `EMAIL_WORKER_ENABLED` | `true` | Enables background in-process outbox polling worker. |
| `EMAIL_MAX_RETRIES` | `5` | Maximum retry threshold before permanent dead-lettering. |
| `EMAIL_RETRY_DELAY_MS` | `1000` | Base delay for exponential backoff calculations ($1\text{s} \times 2^{\text{attempts}}$). |
| `EMAIL_POLL_INTERVAL_MS`| `10000` | Background worker polling interval (10 seconds). |
| `EMAIL_BATCH_SIZE` | `5` | Maximum number of outbox documents claimed per poll cycle. |
| `EMAIL_PROCESSING_LEASE_MS`| `300000` | Crash recovery lease duration (5 minutes). |

### 10.2 MongoDB Atlas Prerequisites
Before routing production traffic to the email outbox:
1. Ensure the `emailoutboxes` collection has its compound worker index built:
   ```javascript
   db.emailoutboxes.createIndex({ status: 1, nextAttemptAt: 1, processingLeaseExpiresAt: 1 });
   db.emailoutboxes.createIndex({ eventKey: 1 }, { unique: true });
   db.emailoutboxes.createIndex({ recipient: 1, createdAt: -1 });
   ```
2. Verify read/write permissions for the Render database user on `shopsphere.emailoutboxes`.

### 10.3 Domain Authentication DNS Configuration (SPF, DKIM, DMARC)
To ensure reliable inbox delivery and prevent emails sent from `@shopsphere.in` from landing in spam or quarantine folders, the following DNS records must be created at the domain registrar / DNS provider (e.g., Cloudflare, Route53, Namecheap):

1. **SPF (Sender Policy Framework)**:
   - **Type**: `TXT`
   - **Host / Name**: `@` (or `shopsphere.in`)
   - **Value**: `v=spf1 include:spf.brevo.com ~all`
   - *Purpose*: Authorizes Brevo mail servers to deliver messages originating from `@shopsphere.in`.

2. **DKIM (DomainKeys Identified Mail)**:
   - **Type**: `TXT`
   - **Host / Name**: `mail._domainkey` (or selector provided in Brevo Dashboard)
   - **Value**: `k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...` *(Obtain exact public key string from Brevo Dashboard)*
   - *Purpose*: Cryptographically signs outbound emails to verify they were not altered in transit.

3. **DMARC (Domain-based Message Authentication, Reporting & Conformance)**:
   - **Type**: `TXT`
   - **Host / Name**: `_dmarc`
   - **Value**: `v=DMARC1; p=none; rua=mailto:dmarc-reports@shopsphere.in`
   - *Purpose*: Instructs receiving servers on handling unaligned messages and requests deliverability telemetry.

### 10.4 Pre-Activation Testing Checklist
Before switching `EMAIL_PROVIDER=brevo` on production Render:
- [ ] Domain status in Brevo Dashboard displays **"Authenticated"** with green checkmarks for SPF and DKIM.
- [ ] Test transactional email dispatched from Brevo Dashboard to an external Gmail and Apple Mail inbox; verify SPF and DKIM alignment (`Authentication-Results: spf=pass, dkim=pass`).
- [ ] Verify `EMAIL_TOKEN_SECRET` in Render Secret Store is $\ge 32$ random characters.
- [ ] Verify `BREVO_API_KEY` is saved and valid.
- [ ] Trigger a test customer registration and inspect MongoDB Atlas outbox: verify status transitions from `pending` -> `processing` -> `sent` with a recorded `providerMessageId`.
- [ ] Verify password reset token scrub: verify that `encryptedTokenPayload` is `$unset` from `templateData` upon delivery confirmation.

