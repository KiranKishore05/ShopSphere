# ShopSphere Transactional Email Infrastructure

This document outlines the architecture, configuration, and security specifications for ShopSphere's transactional email delivery system implemented in Phase 9 Stage 3.2.

---

## 1. Architectural Overview

ShopSphere uses the **MongoDB Transactional Outbox Pattern** to decouple customer-facing business transactions (order placement, online payment verification, and account creation) from third-party email delivery services.

### Core Architecture
1. **Durable Intent Storage (`EmailOutbox`)**:
   Instead of dispatching emails across the network inside HTTP request handlers, controllers write an email intent into the `EmailOutbox` collection.
2. **Session / Atomic Consistency**:
   When available, the outbox record is inserted within the same MongoDB transaction session as the business changes, ensuring that if an order rolls back, the confirmation email is never created.
3. **In-Process Outbox Worker**:
   An asynchronous worker running inside the Node.js process continuously claims and processes pending outbox jobs using atomic document locking.
4. **Provider-Agnostic Adapters**:
   The worker dispatches through a pluggable adapter interface (`BaseEmailAdapter`), supporting `mock` (development/testing) and `brevo` (production).

---

## 2. `EmailOutbox` Schema

Defined in `server/src/models/EmailOutbox.js`:

| Field | Type | Description |
| :--- | :--- | :--- |
| `eventKey` | `String` (Unique) | Deterministic unique key (e.g. `order_confirmed_paid:ORD-123456`) ensuring single delivery per event. |
| `eventType` | `String` (Enum) | `welcome_customer`, `password_reset_request`, `order_confirmed_cod`, `order_confirmed_paid`, `payment_failed`, `order_shipped`, `order_delivered`, `order_cancelled`, `refund_processed`. |
| `recipient` | `String` | Normalized, lowercase recipient email address. |
| `templateData` | `Mixed` | Strictly validated data snapshot required to render the email. Passwords, raw tokens, and card data are forbidden. |
| `status` | `String` (Enum) | `pending`, `processing`, `sent`, `failed`. Default: `pending`. |
| `attempts` | `Number` | Current delivery attempts count. Default: `0`. |
| `maxAttempts` | `Number` | Max retry threshold before permanent failure. Default: `5`. |
| `nextAttemptAt` | `Date` | Timestamp when the job is eligible for the next attempt. Default: `Date.now`. |
| `processingLeaseExpiresAt` | `Date` | Worker safety lease. If a worker crashes, the lease expires (default 5 min), making the job eligible for recovery. |
| `lastError` | `Object` | Sanitized error object (`message`, `statusCode`, `timestamp`). |
| `providerMessageId` | `String` | Message ID returned by the email provider upon successful acceptance. |
| `sentAt` | `Date` | Timestamp of confirmed provider acceptance. |

### Indexes
- `{ eventKey: 1 }` (Unique): Guarantees strict deduplication.
- `{ status: 1, nextAttemptAt: 1, processingLeaseExpiresAt: 1 }`: Enables fast atomic queries for worker claiming.

---

## 3. Worker Lifecycle & Crash Recovery

### Atomic Job Claiming Algorithm
The worker executes an atomic `findOneAndUpdate` query matching any of three scenarios:
1. **Case A (Fresh Pending)**: `status: 'pending'` and `nextAttemptAt <= now`.
2. **Case B (Retryable Failed)**: `status: 'failed'`, `attempts < maxAttempts`, and `nextAttemptAt <= now`.
3. **Case C (Crash Recovery)**: `status: 'processing'` and `processingLeaseExpiresAt <= now`.

When a job is matched:
- It atomically transitions to `status: 'processing'`.
- `processingLeaseExpiresAt` is extended by 5 minutes (`Date.now() + EMAIL_PROCESSING_LEASE_MS`).
- `attempts` is incremented by 1.

Because `findOneAndUpdate` locks the document at the database level, concurrent workers will never claim the same document simultaneously.

### Retry Policy (Exponential Backoff)
If an email provider returns a retryable error (e.g. HTTP 429 Rate Limit, HTTP 500/503, network timeout):
- `status` is set to `'failed'`.
- `nextAttemptAt` is scheduled with exponential backoff:
  $$\text{backoffMs} = \text{baseDelay} \times 2^{\min(\text{attempts}, 6)}$$
- If `attempts >= maxAttempts` (default 5), `nextAttemptAt` is cleared and the job remains permanently failed for administrative review.

---

## 4. Delivery Idempotency & Deduplication

### Multi-Channel Deduplication (Verification vs. Webhook)
Payment confirmations can be triggered by either client verification or a gateway webhook. Both channels construct identical event keys:
```javascript
const eventKey = `order_confirmed_paid:${order.orderNumber}`;
```
If the verification endpoint creates the outbox document, the subsequent webhook's attempt to insert the same `eventKey` triggers MongoDB error 11000. `emailOutboxService.queueEmail()` captures this error and returns `{ queued: false, duplicate: true }` without inserting a second email.

### Exactly-Once Limits
Over unreliable networks (the Two Generals' Problem), exactly-once delivery across external APIs cannot be guaranteed. If Brevo accepts an email but the server crashes before recording the result in MongoDB, the job may be retried after the 5-minute lease expires. ShopSphere mitigates this by using deterministic event keys, generous lease periods, and idempotency headers where supported.

---

## 5. Password Reset Encryption Safeguard

To prevent credential leakage:
1. The `User` model stores only a one-way SHA-256 hash (`user.passwordResetToken`).
2. The raw token is **never** stored in plaintext inside `EmailOutbox.templateData`.
3. In `emailTokenCrypto.js`, the token is encrypted using **AES-256-GCM authenticated encryption** with a dedicated `EMAIL_TOKEN_SECRET` ($\ge 32$ characters).
4. The worker decrypts the token in memory immediately before rendering the email template.
5. Upon confirmed provider acceptance, the worker executes `$unset: { 'templateData.encryptedTokenPayload': '' }`, wiping the encrypted material from the database.

---

## 6. Provider Adapter Configuration

### Default (Development & Testing): Mock Adapter
- In local development and automated tests, `EMAIL_PROVIDER=mock`.
- All sent emails are captured in memory and accessible via `mockAdapter.getSentEmails()`.
- Zero network requests are made; zero external emails are sent.
- In production (`NODE_ENV=production`), `EMAIL_PROVIDER=mock` is strictly prohibited and rejected by environment validation before startup.

### Production: Brevo Adapter
- In production, `EMAIL_PROVIDER=brevo` is required.
- The worker uses Node.js native `fetch` to send HTTP requests to:
  `POST https://api.brevo.com/v3/smtp/email`
- Requires valid `BREVO_API_KEY` (placeholder keys rejected) and verified sender address `EMAIL_FROM_ADDRESS`.
- No third-party SDK is required, avoiding supply-chain dependency vulnerabilities.

### Required Brevo DNS Verification Before Launch
Before sending emails in production from a custom domain (e.g., `orders@shopsphere.in`):
1. **SPF Record**: TXT record with `v=spf1 include:spf.brevo.com ~all`.
2. **DKIM Record**: TXT record for `mail._domainkey.shopsphere.in` with the public key provided in Brevo's Sender Domains dashboard.
3. **DMARC Record**: TXT record for `_dmarc.shopsphere.in` with `v=DMARC1; p=none; rua=mailto:dmarc@shopsphere.in`.

---

## 7. Render Worker Deployment Considerations

- **In-Process Execution**: The worker runs directly inside the web service (`server.js`) on a 10-second polling interval when `EMAIL_WORKER_ENABLED=true` (default: `true`).
- **Worker Toggle**: Setting `EMAIL_WORKER_ENABLED=false` disables the background polling engine while keeping transactional queuing and templates operational (useful if decoupling the worker into an independent background worker instance).
- **Render Free Tier Sleep**: If the web service spins down due to inactivity, pending jobs remain safely stored in MongoDB. When incoming traffic awakens the service, the worker resumes polling and delivers all queued emails.
- **Graceful Shutdown**: On `SIGTERM` or `SIGINT`, `stopEmailWorker({ timeoutMs: 5000 })` halts new job claims and allows active in-flight jobs to complete before the HTTP server and database close. If the worker was never started, shutdown proceeds immediately without delay.

---

## 8. Customer Authentication Email Workflows (Phase 9 Stage 3.3)

### A. Welcome Email Integration
- **Trigger**: Customer account registration (`POST /api/v1/auth/register`).
- **Event Key**: `welcome_customer:${user._id.toString()}` (deterministic, preventing duplicate welcome emails).
- **Outbox Payload**:
  ```json
  {
    "customerName": "Customer Full Name",
    "exploreUrl": "https://shopsphere.in/shop",
    "supportEmail": "support@shopsphere.in"
  }
  ```
- **Resilience & Observability**: If the outbox write encounters a transient error, the customer's account creation still succeeds. Outbox failures are logged using a sanitized diagnostic warning (`console.warn(`[Auth] Failed to queue welcome email for user ID ${user._id}: ${emailErr.message}`)`).
- **Operational Monitoring Limitation**: Because registration is prioritized over email delivery and no secondary in-memory queue is introduced, an outbox database write failure means a welcome email may be missed without rolling back the user account. Production log aggregators should monitor for `[Auth] Failed to queue welcome email` patterns.

### B. Forgot Password & Reset Token Lifecycle
1. **Request (`POST /api/v1/auth/forgot-password`)**:
   - Customer submits email address.
   - **Anti-Enumeration Protection**: Returns an identical HTTP 200 generic message regardless of whether the email exists or is inactive:
     `"If an account exists with this email address, password reset instructions have been sent."`
2. **Cryptographic Token Generation**:
   - Generates 32 bytes of cryptographically secure random entropy (`crypto.randomBytes(32).toString('hex')`).
   - The **raw token is never written to MongoDB** in plaintext.
   - The `User` model stores only the SHA-256 hash:
     ```javascript
     user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
     user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
     ```
3. **Outbox Encryption**:
   - The raw token is encrypted using AES-256-GCM via `encryptToken(rawToken)` using the server's dedicated `EMAIL_TOKEN_SECRET` ($\ge 32$ characters).
   - Only the encrypted payload (`ciphertext`, `iv`, `authTag`) is queued in `EmailOutbox.templateData`.
   - Event Key: `password_reset_request:${user._id}:${tokenHash.slice(0, 16)}`.
4. **Worker Dispatch & URL Fragment Protection**:
   - The worker decrypts the token in memory to compile the action link: `${config.APP_BASE_URL}/reset-password#token=${rawToken}`.
   - **URL Fragment Security**: By transmitting the token inside the URL hash fragment (`#token=`), the token is strictly client-side. Web browsers **never transmit fragments in HTTP request lines or Referer headers**, completely shielding the token from proxy logs, CDN logs, and ISP observation.
   - Upon provider acceptance, the worker executes `$unset: { 'templateData.encryptedTokenPayload': '' }`, permanently deleting the encrypted payload from the database.
5. **Client-Side Token Extraction & URL Sanitization**:
   - On the frontend (`ResetPasswordPage.jsx`), the token is extracted exclusively from `window.location.hash` (`#token=`) into React component state. Query string fallbacks (`window.location.search`) are strictly rejected to ensure insecure reset links are never processed.
   - The page immediately scrubs the address bar and browser history via `window.history.replaceState(null, '', window.location.pathname)`, preventing token exposure in browser history, bookmarks, or shoulder-surfing.
   - The token is submitted exclusively in the HTTPS POST request body.
6. **Sanitized Diagnostic Logging**:
   - Non-fatal background email queueing failures (e.g. during customer registration or password reset requests) log only fixed diagnostic strings with user IDs and optional safe error codes (e.g. `[Auth] Failed to queue welcome email for user ID <id>`).
   - `emailErr.message`, stack traces, recipient email addresses, passwords, and tokens are strictly excluded from server log streams.
7. **Atomic Password Reset Consumption (`POST /api/v1/auth/reset-password`)**:
   - Customer submits the raw token and new password in the request body.
   - The backend hashes the raw token with SHA-256 and executes an **atomic `findOneAndUpdate`**:
     ```javascript
     const user = await User.findOneAndUpdate(
       {
         passwordResetToken: tokenHash,
         passwordResetExpires: { $gt: new Date() }
       },
       {
         $set: { passwordHash },
         $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
       },
       { new: true }
     );
     ```
   - **Concurrency Safety**: If two concurrent requests submit the same token simultaneously, MongoDB's atomic document locking ensures that only the first request matches and unsets the token. The second request receives `user === null` and is rejected with `INVALID_RESET_TOKEN` (HTTP 400).
   - Token replay or reuse attempts are strictly impossible.


---

## 9. Order, Payment & Admin Operational Email Integration (Phase 9 Stage 3.4)

### A. Supported Event Types & Trigger Conditions

| Event Type | Recipient | Trigger Workflow | Required Data Snapshot |
| :--- | :--- | :--- | :--- |
| `order_confirmed_cod` | Customer | `POST /api/v1/orders/checkout` (when `paymentMethod === 'cod'`) | Order number, items, address, subtotal, shipping fee, total, order details URL |
| `order_confirmed_paid` | Customer | `POST /api/v1/payments/razorpay/verify` or webhook (`payment.captured`, `order.paid`) | Order number, items, address, total, Razorpay payment ID, order details URL |
| `payment_failed` | Customer | `POST /api/v1/payments/razorpay/failed` or signature verification failure or webhook (`payment.failed`) | Order number, Razorpay order ID, failure reason, retry payment URL, order details URL |
| `order_shipped` | Customer | `PATCH /api/v1/admin/orders/:id/status` (when `orderStatus === 'shipped'`) | Order number, carrier name, tracking number, tracking URL (optional), order details URL |
| `order_delivered` | Customer | `PATCH /api/v1/admin/orders/:id/status` (when `orderStatus === 'delivered'`) | Order number, delivery timestamp, review URL (optional), order details URL |
| `order_cancelled` | Customer | `PATCH /api/v1/orders/me/:orderNumber/cancel` or admin cancellation | Order number, cancellation reason, refund status summary, order details URL |
| `admin_order_created` | Admin | Successfully confirmed order (COD or Paid Online) | Order number, customer name, total, item count, payment method/status, admin dashboard URL |
| `admin_payment_failed` | Admin | Conclusively recorded payment gateway failure | Order number, customer name, failure reason, total, payment method, admin dashboard URL |
| `admin_order_cancelled` | Admin | Successfully persisted order cancellation | Order number, customer name, cancellation reason, total, payment status, admin dashboard URL |

### B. Deterministic Event-Key Strategy
Every transactional outbox record uses a deterministic key:
- Customer COD Order Confirmation: `order_confirmed_cod:${order._id}`
- Customer Paid Order Confirmation: `order_confirmed_paid:${order._id}`
- Customer Payment Failure: `payment_failed:${order._id}:${paymentIdentifier}`
- Customer Order Shipped: `order_shipped:${order._id}`
- Customer Order Delivered: `order_delivered:${order._id}`
- Customer Order Cancelled: `order_cancelled:${order._id}`
- Admin New Order Alert: `admin_order_created:${order._id}`
- Admin Payment Failure Alert: `admin_payment_failed:${order._id}:${paymentIdentifier}`
- Admin Order Cancellation Alert: `admin_order_cancelled:${order._id}`

The MongoDB unique index on `eventKey` ensures that redundant webhooks, repeated admin clicks, or client retries resolve idempotently with `{ queued: false, duplicate: true }` without creating duplicate outbox entries or duplicate customer emails.

### C. Admin Notification Configuration, Privacy & Safety
- **Configuration Variable**: `ADMIN_NOTIFICATION_EMAIL` in `server/src/config/env.js`.
- **Safe Handling of Missing Recipient**: If `ADMIN_NOTIFICATION_EMAIL` is empty, undefined, or missing, the email dispatcher safely bypasses admin alerts without throwing errors, logging warnings, or inventing fallback email recipients.
- **Customer Privacy Protection**: Customer email addresses are strictly **excluded** from all admin notification payloads and email templates (`admin_order_created`, `admin_payment_failed`, `admin_order_cancelled`). This prevents customer PII from leaking to shared or operational support mailboxes. Administrators instead inspect customer details securely within the authenticated admin dashboard via `adminOrderUrl` (`/admin/orders/:id`).
- **Payment Gateway Error Sanitization**: Gateway failure descriptions are sanitized via `sanitizeFailureReason(reason)` before recording in template data or logs. This strips out raw exception dumps, internal MongoDB connection strings, credentials, and stack traces, standardizing reasons into user-appropriate, safe explanations.

### D. Resilience, Idempotency & Error Sanitization
- **Strict Post-Persistence Triggering**: Outbox queueing is executed only after the relevant business operation (order checkout, status transition, payment verification, or webhook update) has successfully persisted to MongoDB. If database persistence throws or rejects, outbox queuing is aborted.
- **Webhook State Machine Protections**:
  - `payment.captured` webhooks guard against redundant processing (`if (order && order.paymentStatus !== 'paid' && order.orderStatus !== 'cancelled')`), preventing duplicate stock deductions and preventing late payment webhooks from reviving cancelled orders.
  - `payment.failed` webhooks verify `order.paymentStatus !== 'paid' && order.paymentStatus !== 'failed'`, ensuring pending payments never trigger failure emails and paid orders never transition to failed.
- **Non-Fatal Queue Failures**: If an outbox database error occurs, it is caught and logged with a sanitized diagnostic message (e.g. `[OrderEmail] Failed to queue customer confirmation for order #SPH-123 [code: 11000]`). Outbox failures **never rollback or invalidate** already committed orders, cancellations, stock deductions, or payment updates.
- **HTML Escaping**: All dynamic values (customer names, product titles, addresses, tracking numbers, and failure explanations) are HTML-escaped using `escapeHtml()` prior to email compilation to prevent XSS injection.

### E. Known Limitations
- ShopSphere's current MongoDB deployment does not utilize multi-document replica set transactions across order and payment operations. Consequently, email outbox insertion is not committed inside a single atomic multi-document session with order updates. A failure to write to the outbox collection after order commit is logged as a non-fatal warning without blocking customer checkout.

---

## 10. Production Operations, Outbox Monitoring & Recovery Runbook

### 10.1 Outbox Architecture & Worker Lifecycle
ShopSphere uses a durable, database-backed outbox pattern where email dispatch is completely decoupled from HTTP request-response cycles:
```
Client HTTP Action -> Controller saves business entity -> Controller queues EmailOutbox record
                                                                 │
                                                    Background Worker Polls (FIFO)
                                                                 │
                                                       Atomic Claim (Lease)
                                                                 │
                                              Provider Dispatch (Brevo / Mock)
                                                                 │
                                                  Update Status (sent / failed)
```
- **Worker Process**: Runs inside the Express Node.js process managed by `emailWorker.js`. Started conditionally when `EMAIL_WORKER_ENABLED=true` (and disabled during automated testing).
- **Polling Loop**: Ticks every `EMAIL_POLL_INTERVAL_MS` (default 10 seconds), claiming up to `EMAIL_BATCH_SIZE` (default 5) eligible jobs per iteration.
- **Graceful Shutdown**: On `SIGTERM` / `SIGINT`, the server signals the worker to stop accepting new jobs and awaits completion of active in-flight jobs up to `timeoutMs` (default 8 seconds) before closing MongoDB connections.

### 10.2 Outbox Document States & Semantics
Every record in the `emailoutboxes` collection exists in one of four states:

| State | Semantic Meaning | Claim Eligibility |
| :--- | :--- | :--- |
| `pending` | Freshly queued job awaiting initial dispatch. | Eligible if `nextAttemptAt <= new Date()`. |
| `processing` | Job currently claimed by an active worker under a timed lease. | **Ineligible** while `processingLeaseExpiresAt > new Date()`. Eligible for reclamation once lease expires. |
| `sent` | Provider accepted the message (`providerMessageId` recorded). Encrypted tokens scrubbed. | **Terminal state**. Never claimed again. |
| `failed` | Delivery attempt encountered a retryable or permanent error. | Eligible for retry if `attempts < maxAttempts` AND `nextAttemptAt <= new Date()`. Permanently dead-lettered if `attempts >= maxAttempts`. |

### 10.3 Attempt Counts & Retry Backoff Policy
- **Maximum Retries**: Configured by `EMAIL_MAX_RETRIES` (default `5`).
- **Backoff Formula**:
  $$\text{backoffMs} = \text{baseDelayMs} \times 2^{\min(\text{attempts}, 6)}$$
  Where `baseDelayMs = EMAIL_RETRY_DELAY_MS` (default 1000ms):
  - Attempt 1 failure: $\approx 2000\text{ms}$ delay
  - Attempt 2 failure: $\approx 4000\text{ms}$ delay
  - Attempt 3 failure: $\approx 8000\text{ms}$ delay
  - Attempt 4 failure: $\approx 16000\text{ms}$ delay
  - Attempt 5 failure: Terminal failure (attempts capped at 5; no further retries scheduled)
- **Permanent Errors**: For HTTP 400 (Bad Request), 401 (Unauthorized/Bad API Key), or malformed inputs (`error.isRetryable === false`), the worker immediately sets `attempts = maxAttempts` and transitions to `failed` without pointless retries.

### 10.4 Processing Lease Expiration & Crash Recovery
- **Lease Duration**: Configured by `EMAIL_PROCESSING_LEASE_MS` (default 300,000ms / 5 minutes).
- **Crash Recovery**: If the Node.js process crashes, restarts, or Render puts the container to sleep while a job is in `processing`, the lease prevents another worker from touching it until 5 minutes have elapsed.
- **Atomic Reclamation**: When the next worker runs, `claimJob()` evaluates Case C: `{ status: 'processing', processingLeaseExpiresAt: { $lte: new Date() } }`. The crashed job is atomically reclaimed, granted a fresh 5-minute lease, and incremented in attempts.

### 10.5 MongoDB Atlas Monitoring Queries (Read-Only)

> [!NOTE]
> All queries below are strictly read-only diagnostics to run in MongoDB Compass, mongosh, or Atlas Data Explorer.

```javascript
// 1. Overall queue status summary
db.emailoutboxes.aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
]);

// 2. Inspect currently active in-flight jobs (processing)
db.emailoutboxes.find(
  { status: "processing" },
  { eventKey: 1, eventType: 1, recipient: 1, attempts: 1, processingLeaseExpiresAt: 1 }
).sort({ processingLeaseExpiresAt: -1 });

// 3. Find permanently failed / dead-lettered jobs (exhausted retries or fatal error)
db.emailoutboxes.find(
  { status: "failed", attempts: { $gte: 5 } },
  { eventKey: 1, eventType: 1, recipient: 1, attempts: 1, lastError: 1, updatedAt: 1 }
).sort({ updatedAt: -1 }).limit(20);

// 4. Find retryable failed jobs awaiting backoff window
db.emailoutboxes.find(
  { status: "failed", attempts: { $lt: 5 }, nextAttemptAt: { $gt: new Date() } },
  { eventKey: 1, recipient: 1, attempts: 1, nextAttemptAt: 1, lastError: 1 }
).sort({ nextAttemptAt: 1 });

// 5. Inspect recent delivery history for a specific customer email
db.emailoutboxes.find(
  { recipient: "customer@domain.com" },
  { eventKey: 1, eventType: 1, status: 1, providerMessageId: 1, sentAt: 1, lastError: 1 }
).sort({ createdAt: -1 });
```

### 10.6 Safe Manual Re-Queue Procedure (Write Operations)

> [!CAUTION]
> - Never execute bulk manual recovery without investigating root cause (e.g. Brevo billing credit exhaustion, invalid API key).
> - **DO NOT reset active processing leases**: Only re-queue jobs with `status: 'failed'`. Resetting an active `processing` lease risks generating duplicate emails if the worker is actively transmitting.
> - **DO NOT delete outbox records**: Outbox records are audit logs. Never delete records to clear errors.

#### Safe Re-Queue Recipe (Single Specific Job)
Once the underlying issue (e.g., DNS, recipient typo, API key) is resolved:
```javascript
// Verify the target job first
const targetEventKey = "order_confirmed_paid:6731a5f8e123456789abcdef";

// Atomically reset status to pending, clear error, and reset attempts
db.emailoutboxes.updateOne(
  { eventKey: targetEventKey, status: "failed" },
  {
    $set: {
      status: "pending",
      attempts: 0,
      nextAttemptAt: new Date(),
      processingLeaseExpiresAt: null
    },
    $push: {
      "lastError.audit": {
        note: "Manually re-queued by administrator",
        timestamp: new Date()
      }
    }
  }
);
```

### 10.7 Duplicate Delivery Risks & At-Least-Once Delivery Semantics
- **Provider Limitation**: Email protocols (SMTP, transactional HTTP APIs) do not participate in distributed two-phase commits with MongoDB.
- **At-Least-Once Delivery**: If Brevo accepts an email and issues a message ID, but the server container halts before the database updates `status: 'sent'`, the job remains in `processing`. Upon lease expiration, the next worker re-claims and re-sends the email.
- **Mitigation**: ShopSphere passes `eventKey` as an idempotency key to adapters where supported. For customers, receiving an occasional duplicate confirmation email is vastly preferable to silently dropping an order confirmation.

### 10.8 Investigating Missing Customer Notifications
When a customer reports not receiving an email:
1. **Locate Outbox Record**:
   Search by order ID or user ID:
   `db.emailoutboxes.findOne({ eventKey: /ORD-202611-12345/ })`
2. **If Record Does Not Exist**:
   Check server logs for `[OrderEmail] Failed to queue customer confirmation`. Verify if the customer email was empty or unverified at the time of purchase.
3. **If Status is `sent`**:
   Verify `providerMessageId` and check Brevo Dashboard logs. Common causes: customer spam folder, corporate mailbox quarantine, or unverified sender domain (missing SPF/DKIM).
4. **If Status is `failed`**:
   Inspect `lastError`. Check `statusCode`:
   - `400`: Invalid email address or syntax.
   - `401`: Brevo API key revoked or expired.
   - `429`: Daily sending quota exceeded.

### 10.9 Operational Troubleshooting Checklist

| Symptom | Root Cause | Remediation Action |
| :--- | :--- | :--- |
| `[EmailWorker] Polling loop error` | MongoDB connection blip or network partition | Ensure Atlas cluster IP access list includes Render outbound IPs. Worker will automatically recover on next tick. |
| All jobs stuck in `failed` with status code 401 | Expired or incorrect `BREVO_API_KEY` | Update `BREVO_API_KEY` in Render environment secrets. Restart service. Safely re-queue failed jobs using Recipe 10.6. |
| Jobs accumulating in `processing` | Workers crashing before `processJob` completes | Check Render service logs for uncaught exceptions or container out-of-memory kills. Jobs will auto-recover after 5-minute lease expiry. |
| Customer reset link invalid | Reset token expired (> 1 hour) or already consumed | Tokens are single-use. Ask customer to submit a fresh forgot-password request. |

