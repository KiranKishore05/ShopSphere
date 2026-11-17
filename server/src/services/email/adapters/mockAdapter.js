import crypto from 'node:crypto';
import BaseEmailAdapter from './baseAdapter.js';

export class MockEmailAdapter extends BaseEmailAdapter {
  constructor() {
    super('mock');
    this.sentEmails = [];
    this.shouldFail = false;
    this.failureError = null;
    this.shouldTimeout = false;
  }

  /**
   * Configure simulated failure for testing resilience and retries.
   */
  setSimulateFailure(fail = true, customError = null) {
    this.shouldFail = Boolean(fail);
    this.failureError = customError;
  }

  /**
   * Configure simulated network timeout.
   */
  setSimulateTimeout(timeout = true) {
    this.shouldTimeout = Boolean(timeout);
  }

  /**
   * Clears the in-memory log of captured emails.
   */
  clearSentEmails() {
    this.sentEmails = [];
  }

  /**
   * Retrieves all emails sent through this mock instance.
   */
  getSentEmails() {
    return [...this.sentEmails];
  }

  /**
   * Retrieves the most recently sent email.
   */
  getLastEmail() {
    return this.sentEmails[this.sentEmails.length - 1] || null;
  }

  async send(options) {
    if (this.shouldTimeout) {
      const err = new Error('Mock email provider request timed out after 5000ms.');
      err.code = 'ETIMEDOUT';
      throw err;
    }

    if (this.shouldFail) {
      if (this.failureError) {
        throw this.failureError;
      }
      const err = new Error('Simulated upstream email provider failure (HTTP 500 Service Unavailable).');
      err.statusCode = 500;
      throw err;
    }

    const messageId = `mock_msg_${crypto.randomUUID()}`;
    const sentRecord = {
      messageId,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      idempotencyKey: options.idempotencyKey || null,
      headers: options.headers || {},
      sentAt: new Date()
    };

    this.sentEmails.push(sentRecord);

    return {
      success: true,
      messageId,
      mock: true
    };
  }
}

export const mockAdapter = new MockEmailAdapter();
export default mockAdapter;

