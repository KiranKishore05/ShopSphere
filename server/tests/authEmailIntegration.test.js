import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import EmailOutbox from '../src/models/EmailOutbox.js';
import * as emailOutboxService from '../src/services/email/emailOutboxService.js';
import { decryptToken } from '../src/utils/emailTokenCrypto.js';
import config from '../src/config/env.js';

describe('Phase 9 Stage 3.3: Authentication & Customer Email Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);
  });

  // ============================================================================
  // 1. Customer Registration & Welcome Email
  // ============================================================================
  describe('1. Customer Registration & Welcome Email', () => {
    it('should successfully register customer and queue a welcome email with stable eventKey', async () => {
      const mockCreatedUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Aishwarya Rai',
        email: 'aishwarya@atelier.com',
        role: 'customer',
        phone: '+919876543210',
        createdAt: new Date()
      };

      vi.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      vi.spyOn(User, 'hashPassword').mockResolvedValueOnce('hashed_password_123');
      vi.spyOn(User, 'create').mockResolvedValueOnce(mockCreatedUser);
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValueOnce({
        queued: true,
        outboxId: 'outbox_welcome_1',
        eventKey: 'welcome_customer:507f1f77bcf86cd799439011'
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Aishwarya Rai',
          email: 'aishwarya@atelier.com',
          password: 'SecurePassword123!',
          phone: '+919876543210'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('aishwarya@atelier.com');

      // Verify email queued with correct parameters and no sensitive data
      expect(queueEmailSpy).toHaveBeenCalledTimes(1);
      expect(queueEmailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventKey: 'welcome_customer:507f1f77bcf86cd799439011',
          eventType: 'welcome_customer',
          recipient: 'aishwarya@atelier.com',
          templateData: expect.objectContaining({
            customerName: 'Aishwarya Rai',
            exploreUrl: expect.stringContaining('/shop'),
            supportEmail: expect.any(String)
          })
        })
      );
    });

    it('should reject registration if email already exists and avoid queueing an email', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValueOnce({
        _id: 'existing_user_id',
        email: 'existing@atelier.com'
      });
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Duplicate User',
          email: 'existing@atelier.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });

    it('should not fail registration if outbox email queuing encounters an error', async () => {
      const mockCreatedUser = {
        _id: '507f1f77bcf86cd799439022',
        name: 'Kabir Khan',
        email: 'kabir@atelier.com',
        role: 'customer',
        createdAt: new Date()
      };

      vi.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      vi.spyOn(User, 'hashPassword').mockResolvedValueOnce('hashed_password_123');
      vi.spyOn(User, 'create').mockResolvedValueOnce(mockCreatedUser);
      // Simulate transient outbox failure with potentially sensitive error details
      const sensitiveErrorMessage = 'Sensitive database internal failure: connection string mongodb+srv://admin:secret@atlas.cluster';
      vi.spyOn(emailOutboxService, 'queueEmail').mockRejectedValueOnce(
        new Error(sensitiveErrorMessage)
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Kabir Khan',
          email: 'kabir@atelier.com',
          password: 'Password123!'
        });

      // User registration must still succeed despite email outbox glitch
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.name).toBe('Kabir Khan');

      // Verify sanitized logging: fixed diagnostic message, no raw error message, no user email or sensitive details
      expect(warnSpy).toHaveBeenCalledWith(
        '[Auth] Failed to queue welcome email for user ID 507f1f77bcf86cd799439022'
      );
      const loggedMessage = warnSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain(sensitiveErrorMessage);
      expect(loggedMessage).not.toContain('kabir@atelier.com');
      expect(loggedMessage).not.toContain('Password123!');
      expect(loggedMessage).not.toContain('stack');
      warnSpy.mockRestore();
    });
  });

  // ============================================================================
  // 2. Forgot Password Request & Secure Token Outbox
  // ============================================================================
  describe('2. Forgot Password Request Flow', () => {
    it('should generate hashed token in DB, encrypt raw token in Outbox, and return generic response', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439033',
        name: 'Tara Sutaria',
        email: 'tara@atelier.com',
        isActive: true,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser);
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail').mockResolvedValueOnce({
        queued: true,
        outboxId: 'outbox_reset_1',
        eventKey: 'password_reset_request:507f1f77bcf86cd799439033:mock'
      });

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'tara@atelier.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists with this email address');

      // 1. Verify User document received a SHA-256 hash (64 hex characters), NOT the raw token
      expect(mockUser.save).toHaveBeenCalled();
      expect(mockUser.passwordResetToken).toHaveLength(64);
      expect(mockUser.passwordResetExpires).toBeInstanceOf(Date);
      expect(mockUser.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());

      // 2. Verify EmailOutbox received AES-256-GCM encrypted payload, NOT raw token
      expect(queueEmailSpy).toHaveBeenCalledTimes(1);
      const queueArgs = queueEmailSpy.mock.calls[0][0];
      expect(queueArgs.eventType).toBe('password_reset_request');
      expect(queueArgs.recipient).toBe('tara@atelier.com');

      const { encryptedTokenPayload } = queueArgs.templateData;
      expect(encryptedTokenPayload).toBeDefined();
      expect(encryptedTokenPayload.ciphertext).toBeDefined();
      expect(encryptedTokenPayload.iv).toHaveLength(32); // 16 bytes hex
      expect(encryptedTokenPayload.authTag).toHaveLength(32); // 16 bytes hex

      // 3. Verify the encrypted token can be decrypted and matches the SHA-256 hash stored in DB
      const decryptedToken = decryptToken(encryptedTokenPayload);
      const calculatedHash = crypto.createHash('sha256').update(decryptedToken).digest('hex');
      expect(calculatedHash).toBe(mockUser.passwordResetToken);
    });

    it('should return identical generic response when email does not exist (prevents account enumeration)', async () => {
      vi.spyOn(User, 'findOne').mockResolvedValueOnce(null);
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'unknown.stranger@domain.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('If an account exists with this email address, password reset instructions have been sent.');
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });

    it('should return identical generic response when user account is deactivated', async () => {
      const mockInactiveUser = {
        _id: 'inactive_user_id',
        email: 'banned@atelier.com',
        isActive: false
      };
      vi.spyOn(User, 'findOne').mockResolvedValueOnce(mockInactiveUser);
      const queueEmailSpy = vi.spyOn(emailOutboxService, 'queueEmail');

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'banned@atelier.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists with this email address');
      expect(queueEmailSpy).not.toHaveBeenCalled();
    });

    it('should sanitize log output and preserve generic response if outbox queueing fails for forgot-password', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439055',
        name: 'Sara Khan',
        email: 'sara@atelier.com',
        isActive: true,
        save: vi.fn().mockResolvedValue(true)
      };

      vi.spyOn(User, 'findOne').mockResolvedValueOnce(mockUser);
      const sensitiveErrorMessage = 'Upstream mail server down: auth_token=secret_pass';
      vi.spyOn(emailOutboxService, 'queueEmail').mockRejectedValueOnce(
        new Error(sensitiveErrorMessage)
      );

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'sara@atelier.com' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('If an account exists with this email address');

      expect(warnSpy).toHaveBeenCalledWith(
        '[Auth] Failed to queue password reset email for user ID 507f1f77bcf86cd799439055'
      );
      const loggedMessage = warnSpy.mock.calls[0][0];
      expect(loggedMessage).not.toContain(sensitiveErrorMessage);
      expect(loggedMessage).not.toContain('sara@atelier.com');
      expect(loggedMessage).not.toContain('secret_pass');
      warnSpy.mockRestore();
    });
  });

  // ============================================================================
  // 3. Password Reset Completion Flow & Atomic Token Consumption
  // ============================================================================
  describe('3. Password Reset Completion Flow', () => {
    it('should successfully reset password with valid token and clear reset fields atomically', async () => {
      const rawToken = 'my_super_secret_raw_reset_token_64_characters_long_entropy_value';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      const mockUpdatedUser = {
        _id: '507f1f77bcf86cd799439044',
        name: 'Kriti Sanon',
        email: 'kriti@atelier.com'
      };

      vi.spyOn(User, 'hashPassword').mockResolvedValueOnce('new_bcrypt_hash_987');
      const findOneAndUpdateSpy = vi.spyOn(User, 'findOneAndUpdate').mockResolvedValueOnce(mockUpdatedUser);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: rawToken,
          password: 'NewStrongPassword456!'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toContain('Password has been reset successfully');

      // Verify User received new bcrypt hash and reset fields were atomically wiped
      expect(User.hashPassword).toHaveBeenCalledWith('NewStrongPassword456!');
      expect(findOneAndUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          passwordResetToken: tokenHash,
          passwordResetExpires: expect.objectContaining({ $gt: expect.any(Date) })
        }),
        expect.objectContaining({
          $set: { passwordHash: 'new_bcrypt_hash_987', passwordChangedAt: expect.any(Date) },
          $unset: { passwordResetToken: 1, passwordResetExpires: 1 }
        }),
        { new: true }
      );
    });

    it('should atomically allow exactly one request to succeed when two concurrent requests submit the same reset token', async () => {
      const rawToken = 'concurrent_test_token_entropy_1234567890abcdef';
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

      vi.spyOn(User, 'hashPassword').mockResolvedValue('hashed_password_concurrent');

      // Atomic lock simulation: The first concurrent operation acquires document lock and succeeds.
      // The second concurrent operation finds no matching document (already consumed) and returns null.
      const findOneAndUpdateSpy = vi.spyOn(User, 'findOneAndUpdate')
        .mockResolvedValueOnce({
          _id: '507f1f77bcf86cd799439055',
          email: 'concurrent@atelier.com',
          name: 'Concurrent User'
        })
        .mockResolvedValueOnce(null);

      // Execute both requests concurrently
      const [res1, res2] = await Promise.all([
        request(app).post('/api/v1/auth/reset-password').send({
          token: rawToken,
          password: 'FirstNewPassword123!'
        }),
        request(app).post('/api/v1/auth/reset-password').send({
          token: rawToken,
          password: 'SecondNewPassword456!'
        })
      ]);

      // Exactly one succeeds (200), and exactly one is rejected (400)
      const statuses = [res1.status, res2.status].sort();
      expect(statuses).toEqual([200, 400]);

      const successfulRes = res1.status === 200 ? res1 : res2;
      const failedRes = res1.status === 400 ? res1 : res2;

      expect(successfulRes.body.success).toBe(true);
      expect(successfulRes.body.data.message).toContain('Password has been reset successfully');

      expect(failedRes.body.success).toBe(false);
      expect(failedRes.body.error.code).toBe('INVALID_RESET_TOKEN');

      expect(findOneAndUpdateSpy).toHaveBeenCalledTimes(2);
    });

    it('should reject reset request when token is invalid or expired', async () => {
      vi.spyOn(User, 'hashPassword').mockResolvedValueOnce('hash_123');
      vi.spyOn(User, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'expired_or_tampered_token',
          password: 'NewPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
      expect(res.body.error.message).toContain('invalid or has expired');
    });

    it('should reject reset request when password is shorter than 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'some_token',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should prevent token reuse once cleared', async () => {
      vi.spyOn(User, 'hashPassword').mockResolvedValueOnce('hash_123');
      vi.spyOn(User, 'findOneAndUpdate').mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: 'already_used_token',
          password: 'AnotherPassword123!'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RESET_TOKEN');
    });
  });
});
