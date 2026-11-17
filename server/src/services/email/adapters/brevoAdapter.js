import BaseEmailAdapter from './baseAdapter.js';
import config from '../../../config/env.js';

const BREVO_API_ENDPOINT = 'https://api.brevo.com/v3/smtp/email';
const DEFAULT_TIMEOUT_MS = 10000;

export class BrevoEmailAdapter extends BaseEmailAdapter {
  constructor(apiKey = config.BREVO_API_KEY, timeoutMs = DEFAULT_TIMEOUT_MS) {
    super('brevo');
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async send(options) {
    const apiKey = this.apiKey || config.BREVO_API_KEY;

    if (!apiKey || apiKey === 'placeholder_brevo_key') {
      const err = new Error('Brevo adapter configuration error: Valid BREVO_API_KEY is required.');
      err.isOperational = true;
      err.isRetryable = false;
      throw err;
    }

    const senderEmail = config.EMAIL_FROM_ADDRESS || 'orders@shopsphere.in';
    const senderName = config.EMAIL_FROM_NAME || 'ShopSphere';

    const payload = {
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: options.to
        }
      ],
      subject: options.subject,
      htmlContent: options.html,
      textContent: options.text || options.subject
    };

    if (options.headers && typeof options.headers === 'object') {
      payload.headers = options.headers;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(BREVO_API_ENDPOINT, {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const statusCode = response.status;
        const errorMessage = data?.message || data?.error || `HTTP ${statusCode} response from Brevo`;

        const err = new Error(`Brevo delivery failed: ${errorMessage}`);
        err.statusCode = statusCode;
        // 429 (Rate Limit) and 5xx (Server Error) are retryable
        err.isRetryable = statusCode === 429 || statusCode >= 500;
        throw err;
      }

      const messageId = data?.messageId || `brevo_${Date.now()}`;

      return {
        success: true,
        messageId,
        provider: 'brevo'
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutErr = new Error(`Brevo request timed out after ${this.timeoutMs}ms.`);
        timeoutErr.code = 'ETIMEDOUT';
        timeoutErr.isRetryable = true;
        throw timeoutErr;
      }

      // Re-throw handled error without printing API keys or payload
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

export const brevoAdapter = new BrevoEmailAdapter();
export default brevoAdapter;

