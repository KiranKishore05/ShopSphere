import EmailOutbox from '../../models/EmailOutbox.js';
import { validateTemplateData } from '../../validators/emailValidators.js';

/**
 * Queues a transactional email into the durable MongoDB EmailOutbox collection.
 * 
 * Guarantees:
 * - Strict schema validation on templateData prevents sensitive credential leakage.
 * - Atomic insertion supports MongoDB sessions for unified business transactions.
 * - Deduplication via unique eventKey index: Duplicate events (e.g. repeated webhooks)
 *   resolve idempotently with { queued: false, duplicate: true } without error or duplicate sends.
 * 
 * @param {Object} params
 * @param {string} params.eventKey - Unique deterministic key (e.g. 'order_confirmed_paid:ORD-123')
 * @param {string} params.eventType - Validated EMAIL_EVENT_TYPES enum value
 * @param {string} params.recipient - Target email address
 * @param {Object} params.templateData - Event-specific data snapshot
 * @param {ClientSession} [params.session] - Optional Mongoose ClientSession for transaction atomicity
 * @returns {Promise<{ queued: boolean, duplicate?: boolean, outboxId?: string, eventKey: string }>}
 */
export const queueEmail = async ({ eventKey, eventType, recipient, templateData, session = null }) => {
  if (!eventKey || typeof eventKey !== 'string') {
    throw new Error('queueEmail: eventKey is required and must be a non-empty string.');
  }

  if (!recipient || typeof recipient !== 'string') {
    throw new Error('queueEmail: recipient is required and must be a valid email string.');
  }

  const normalizedRecipient = recipient.trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(normalizedRecipient)) {
    throw new Error(`queueEmail: Invalid recipient email syntax '${normalizedRecipient}'.`);
  }

  // Strict event-specific schema validation. Throws immediately if data is malformed
  // or contains forbidden sensitive keys (passwords, raw tokens, signatures).
  const validatedData = validateTemplateData(eventType, templateData);

  const outboxData = {
    eventKey: eventKey.trim(),
    eventType,
    recipient: normalizedRecipient,
    templateData: validatedData,
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    nextAttemptAt: new Date()
  };

  const createOpts = session ? { session } : {};

  try {
    const [saved] = await EmailOutbox.create([outboxData], createOpts);
    return {
      queued: true,
      outboxId: saved._id.toString(),
      eventKey: saved.eventKey
    };
  } catch (error) {
    // MongoDB duplicate key error (code 11000) indicates an already queued/processed event.
    // Handle idempotently to prevent duplicate email generation from concurrent callbacks/webhooks.
    if (error.code === 11000 || (error.message && error.message.includes('E11000'))) {
      return {
        queued: false,
        duplicate: true,
        eventKey: eventKey.trim()
      };
    }

    // Re-throw genuine database or operational errors
    throw error;
  }
};

