import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { checkDbReadiness } from '../src/middleware/dbReadiness.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('Phase 2: Database Health, Readiness & Reliability Suite', () => {
  describe('Health Endpoint (/api/v1/health)', () => {
    it('should accurately return 503 and unhealthy status when database is disconnected', async () => {
      // Ensure readyState is 0 (disconnected)
      const originalReadyState = mongoose.connection.readyState;
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.data.status).toBe('unhealthy');
      expect(res.body.data.isReady).toBe(false);
      expect(res.body.data.database.connected).toBe(false);
      expect(res.body.data.database.status).toBe('disconnected');

      vi.restoreAllMocks();
    });

    it('should return 200 and healthy status when database is connected', async () => {
      // Mock readyState as 1 (connected)
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('healthy');
      expect(res.body.data.isReady).toBe(true);
      expect(res.body.data.database.connected).toBe(true);
      expect(res.body.data.database.status).toBe('connected');

      vi.restoreAllMocks();
    });

    it('should keep / and /api/v1 informational endpoints accessible without database', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const rootRes = await request(app).get('/');
      expect(rootRes.status).toBe(200);
      expect(rootRes.body.success).toBe(true);

      const v1Res = await request(app).get('/api/v1');
      expect(v1Res.status).toBe(200);
      expect(v1Res.body.success).toBe(true);

      vi.restoreAllMocks();
    });
  });

  describe('Database Readiness Middleware (checkDbReadiness)', () => {
    it('should immediately intercept database-dependent endpoints with 503 SERVICE_UNAVAILABLE when disconnected', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

      const endpoints = [
        ['GET', '/api/v1/products'],
        ['GET', '/api/v1/categories'],
        ['GET', '/api/v1/cart'],
        ['POST', '/api/v1/auth/login'],
        ['GET', '/api/v1/wishlist']
      ];

      for (const [method, url] of endpoints) {
        const res = method === 'GET'
          ? await request(app).get(url)
          : await request(app).post(url).send({});

        expect(res.status).toBe(503);
        expect(res.body.success).toBe(false);
        expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
        expect(res.body.error.message).toContain('Database service is currently unavailable');
      }

      vi.restoreAllMocks();
    });

    it('should invoke next() without error when database is connected', () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

      const req = {};
      const res = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn()
      };
      const next = vi.fn();

      checkDbReadiness(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should return connecting status when readyState is 2', async () => {
      vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(2);

      const res = await request(app).get('/api/v1/products');
      expect(res.status).toBe(503);
      expect(res.body.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(res.body.error.message).toContain('establishing');

      vi.restoreAllMocks();
    });
  });

  describe('Error Handler (errorHandler) for MongoDB Failures', () => {
    it('should format MongoServerSelectionError into 503 SERVICE_UNAVAILABLE', () => {
      const err = new Error('connect ECONNREFUSED 127.0.0.1:27017');
      err.name = 'MongoServerSelectionError';

      const req = {};
      let responseStatusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          responseStatusCode = code;
          return res;
        },
        json: (payload) => {
          responseBody = payload;
          return res;
        }
      };

      errorHandler(err, req, res, () => {});

      expect(responseStatusCode).toBe(503);
      expect(responseBody.success).toBe(false);
      expect(responseBody.error.code).toBe('SERVICE_UNAVAILABLE');
      expect(responseBody.error.message).toContain('Database service is temporarily unavailable');
      expect(responseBody.error.details[0].field).toBe('database');
    });

    it('should format MongoNetworkError into 503 SERVICE_UNAVAILABLE', () => {
      const err = new Error('connection closed');
      err.name = 'MongoNetworkError';

      let responseStatusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          responseStatusCode = code;
          return res;
        },
        json: (payload) => {
          responseBody = payload;
          return res;
        }
      };

      errorHandler(err, {}, res, () => {});

      expect(responseStatusCode).toBe(503);
      expect(responseBody.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should format Mongoose buffering timeout error into 503 SERVICE_UNAVAILABLE', () => {
      const err = new Error('Operation `products.find()` buffering timed out after 10000ms');
      err.name = 'MongooseError';

      let responseStatusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          responseStatusCode = code;
          return res;
        },
        json: (payload) => {
          responseBody = payload;
          return res;
        }
      };

      errorHandler(err, {}, res, () => {});

      expect(responseStatusCode).toBe(503);
      expect(responseBody.error.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('should format Mongoose Schema ValidationError into 400 VALIDATION_ERROR', () => {
      const err = new Error('Validation failed');
      err.name = 'ValidationError';
      err.errors = {
        name: { path: 'name', message: 'Product name is required' }
      };

      let responseStatusCode = null;
      let responseBody = null;
      const res = {
        status: (code) => {
          responseStatusCode = code;
          return res;
        },
        json: (payload) => {
          responseBody = payload;
          return res;
        }
      };

      errorHandler(err, {}, res, () => {});

      expect(responseStatusCode).toBe(400);
      expect(responseBody.error.code).toBe('VALIDATION_ERROR');
      expect(responseBody.error.details[0].field).toBe('name');
    });
  });
});
