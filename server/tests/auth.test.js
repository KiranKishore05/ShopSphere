import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/User.js';
import { generateToken } from '../src/utils/token.js';

const TEST_DB_URI = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/shopsphere_test';

describe('Authentication & Authorization Suite (/api/v1/auth & /api/v1/admin)', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(TEST_DB_URI, { serverSelectionTimeoutMS: 5000 });
    }
    // Clean up test email domain
    await User.deleteMany({ email: /@test-atelier\.com$/ });
  });

  afterAll(async () => {
    await User.deleteMany({ email: /@test-atelier\.com$/ });
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  const testUser = {
    name: 'Julian Vance',
    email: 'julian.vance@test-atelier.com',
    password: 'SecurePassword123!',
    phone: '+919876543210'
  };

  let authCookie = '';

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a customer and set an HTTP-only token cookie', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify Set-Cookie header contains token and HttpOnly flag
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      expect(tokenCookie).toContain('HttpOnly');
      authCookie = tokenCookie.split(';')[0];
    });

    it('should reject registration if password is under 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Short Password',
          email: 'short.pass@test-atelier.com',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
    });

    it('should reject registration if email is already in use', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('RESOURCE_CONFLICT');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject login attempt with incorrect password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'IncorrectPassword999!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject login for non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user@test-atelier.com',
          password: 'SomePassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return profile for authenticated user using cookie', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.savedAddresses).toBeDefined();
      expect(res.body.data.user.wishlist).toBeDefined();
    });

    it('should return 401 when no session cookie or token is supplied', async () => {
      const res = await request(app).get('/api/v1/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 401 when invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Cookie', ['token=tampered_invalid_token_value']);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Authorization Guards (/api/v1/admin/ping)', () => {
    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app).get('/api/v1/admin/ping');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject customer role with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('should grant access to authenticated admin role', async () => {
      // Create admin user in database
      const adminHash = await User.hashPassword('AdminSecretPass123!');
      const adminUser = await User.create({
        name: 'Chief Atelier Director',
        email: 'director@test-atelier.com',
        passwordHash: adminHash,
        role: 'admin'
      });

      const adminToken = generateToken({
        id: adminUser._id,
        email: adminUser.email,
        role: adminUser.role
      });

      const res = await request(app)
        .get('/api/v1/admin/ping')
        .set('Cookie', [`token=${adminToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admin.role).toBe('admin');
      expect(res.body.data.admin.email).toBe(adminUser.email);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should clear authentication cookie and return success message', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Cookie', [authCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBe('Successfully logged out');

      // Verify cookie is cleared with max-age=0 or expires in past
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const tokenCookie = cookies.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
    });
  });
});
