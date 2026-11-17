import EmailOutbox from '../../models/EmailOutbox.js';
import renderEmailTemplate from './templates/index.js';
import mockAdapter from './adapters/mockAdapter.js';
import brevoAdapter from './adapters/brevoAdapter.js';
import config from '../../config/env.js';

/**
 * Resolves the configured email adapter based on environment settings.
 */
export const resolveAdapter = (providerName = config.EMAIL_PROVIDER) => {
  if (providerName === 'brevo') {
    return brevoAdapter;
  }
  if (providerName === 'mock') {
    return mockAdapter;
  }
  throw new Error(`Unsupported email provider adapter: '${providerName}'. Supported providers: 'mock', 'brevo'.`);
};

/**
 * Atomically claims the next eligible job from the EmailOutbox collection.
 * 
 * Supports three distinct claim cases:
 * 1. Fresh 'pending' jobs ready for initial delivery.
 * 2. 'failed' jobs eligible for retry whose backoff period has elapsed.
 * 3. Abandoned 'processing' jobs whose processing lease has expired due to a worker crash.
 */
export const claimJob = async (leaseDurationMs = config.EMAIL_PROCESSING_LEASE_MS || 300000) => {
  const now = new Date();
  const maxAttempts = config.EMAIL_MAX_RETRIES || 5;

  return await EmailOutbox.findOneAndUpdate(
    {
      attempts: { $lt: maxAttempts },
      $or: [
        // Case A: Fresh pending jobs ready for delivery
        {
          status: 'pending',
          nextAttemptAt: { $lte: now }
        },
        // Case B: Failed jobs eligible for retry whose backoff period has elapsed
        {
          status: 'failed',
          nextAttemptAt: { $lte: now }
        },
        // Case C: Stale in-flight jobs whose worker crashed or timed out
        {
          status: 'processing',
          processingLeaseExpiresAt: { $lte: now }
        }
      ]
    },
    {
      $set: {
        status: 'processing',
        processingLeaseExpiresAt: new Date(now.getTime() + leaseDurationMs)
      },
      $inc: { attempts: 1 }
    },
    {
      sort: { nextAttemptAt: 1 },
      new: true
    }
  );
};

/**
 * Executes a single claimed outbox job.
 * Renders template, sends via adapter, and records delivery confirmation.
 */
export const processJob = async (job, adapter = resolveAdapter()) => {
  if (!job) return null;

  try {
    // 1. Render template
    const { subject, html, text } = renderEmailTemplate(job.eventType, job.templateData);

    // 2. Dispatch via provider adapter
    const sendResult = await adapter.send({
      to: job.recipient,
      subject,
      html,
      text,
      idempotencyKey: job.eventKey
    });

    // 3. Mark job as sent only AFTER provider confirms acceptance
    const updateOps = {
      $set: {
        status: 'sent',
        sentAt: new Date(),
        providerMessageId: sendResult.messageId || 'unknown_id',
        processingLeaseExpiresAt: null
      }
    };

    // If templateData contains an encrypted reset token, scrub it immediately after sending
    if (job.templateData?.encryptedTokenPayload) {
      updateOps.$unset = { 'templateData.encryptedTokenPayload': '' };
    }

    await EmailOutbox.updateOne({ _id: job._id }, updateOps);

    return { success: true, jobId: job._id, messageId: sendResult.messageId };
  } catch (error) {
    const maxAttempts = job.maxAttempts || config.EMAIL_MAX_RETRIES || 5;
    const currentAttempts = job.attempts; // Note: already incremented during claim

    const isPermanentFailure = currentAttempts >= maxAttempts || error.isRetryable === false;

    // Calculate exponential backoff delay (e.g. 1s, 2s, 4s, 8s...)
    const baseDelayMs = config.EMAIL_RETRY_DELAY_MS || 1000;
    const backoffMs = baseDelayMs * Math.pow(2, Math.min(currentAttempts, 6));
    const nextAttemptAt = new Date(Date.now() + backoffMs);

    const sanitizedError = {
      message: error.message ? error.message.substring(0, 300) : 'Unknown delivery failure',
      statusCode: error.statusCode || null,
      timestamp: new Date()
    };

    const updateFields = {
      status: 'failed',
      lastError: sanitizedError,
      processingLeaseExpiresAt: null
    };

    if (isPermanentFailure) {
      updateFields.attempts = maxAttempts;
    } else {
      updateFields.nextAttemptAt = nextAttemptAt;
    }

    await EmailOutbox.updateOne({ _id: job._id }, { $set: updateFields });

    return {
      success: false,
      jobId: job._id,
      error: sanitizedError.message,
      isPermanent: isPermanentFailure
    };
  }
};

class EmailWorkerEngine {
  constructor() {
    this.intervalId = null;
    this.isPolling = false;
    this.isRunning = false;
    this.activeJobsCount = 0;
  }

  async tick(batchSize = config.EMAIL_BATCH_SIZE || 5) {
    if (this.isPolling || !this.isRunning) return;
    this.isPolling = true;

    try {
      const promises = [];
      for (let i = 0; i < batchSize; i++) {
        const job = await claimJob();
        if (!job) break; // No more eligible jobs

        this.activeJobsCount++;
        const p = processJob(job).finally(() => {
          this.activeJobsCount = Math.max(0, this.activeJobsCount - 1);
        });
        promises.push(p);
      }

      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    } catch (err) {
      // Catch transient polling loop errors without crashing worker
      console.error('[EmailWorker] Polling loop error:', err.message);
    } finally {
      this.isPolling = false;
    }
  }

  start(intervalMs = config.EMAIL_POLL_INTERVAL_MS || 10000) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Initial immediate tick
    this.tick().catch(() => {});

    this.intervalId = setInterval(() => {
      this.tick().catch(() => {});
    }, intervalMs);

    // Prevent worker timer from blocking process exit if unref is supported
    if (this.intervalId && typeof this.intervalId.unref === 'function') {
      this.intervalId.unref();
    }
  }

  async stop(timeoutMs = 8000) {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Wait for active in-flight jobs to finish before resolving
    const startTime = Date.now();
    while (this.activeJobsCount > 0 && Date.now() - startTime < timeoutMs) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

export const emailWorker = new EmailWorkerEngine();

export const startEmailWorker = (options = {}) => {
  const intervalMs = options.intervalMs || config.EMAIL_POLL_INTERVAL_MS || 10000;
  emailWorker.start(intervalMs);
  return emailWorker;
};

export const stopEmailWorker = (options = {}) => {
  const timeoutMs = options.timeoutMs || 8000;
  return emailWorker.stop(timeoutMs);
};

export default emailWorker;

