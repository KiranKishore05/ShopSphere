/**
 * Abstract Base Email Adapter Interface
 * All concrete providers (Mock, Brevo, Resend, SMTP) implement this contract.
 */
export class BaseEmailAdapter {
  constructor(name = 'base') {
    this.name = name;
  }

  /**
   * Dispatches an email through the provider.
   * @param {Object} options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject line
   * @param {string} options.html - Rendered HTML body
   * @param {string} options.text - Plain-text fallback
   * @param {string} [options.idempotencyKey] - Unique key for provider-side deduplication
   * @param {Object} [options.headers] - Custom email headers
   * @returns {Promise<{ success: boolean, messageId: string, raw?: any }>}
   */
  async send(options) {
    throw new Error(`send() method not implemented in ${this.name} adapter.`);
  }
}

export default BaseEmailAdapter;

