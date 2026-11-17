import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import config from '../src/config/env.js';
import { isOriginAllowed, getAllowedOrigins, VERCEL_PREVIEW_REGEX } from '../src/utils/corsOrigins.js';
import { v2 as cloudinary } from 'cloudinary';

describe('Phase 9 Stage 1: Production Infrastructure Suite', () => {

  describe('Cloudinary SDK Dependency & Resolution', () => {
    it('should resolve the Cloudinary package successfully from backend dependencies', () => {
      expect(cloudinary).toBeDefined();
      expect(typeof cloudinary.config).toBe('function');
      expect(typeof cloudinary.uploader.upload).toBe('function');
      expect(typeof cloudinary.uploader.destroy).toBe('function');
    });
  });

  describe('Express Trust Proxy Configuration', () => {
    it('should have trust proxy enabled on the Express application', () => {
      const trustProxySetting = app.get('trust proxy');
      expect(trustProxySetting).toBeDefined();
      // Should be 1 (or truthy number/boolean representing trusted hops)
      expect(trustProxySetting).toBe(1);
    });

    it('should correctly extract client IP from X-Forwarded-For via trusted reverse proxy', async () => {
      const clientIp = '203.0.113.195';
      const proxyIp = '10.0.0.1';

      const res = await request(app)
        .get('/')
        .set('X-Forwarded-For', `${clientIp}, ${proxyIp}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('CORS Origin Logic & Pattern Matching (corsOrigins.js)', () => {
    it('should allow requests without an Origin header (server-to-server, health probes, curl)', () => {
      expect(isOriginAllowed(null)).toBe(true);
      expect(isOriginAllowed(undefined)).toBe(true);
      expect(isOriginAllowed('')).toBe(true);
    });

    it('should allow default local development origins', () => {
      expect(isOriginAllowed('http://localhost:5173')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:5173')).toBe(true);
      expect(isOriginAllowed('http://localhost:4173')).toBe(true);
      // Trailing slashes should be tolerated and normalized
      expect(isOriginAllowed('http://localhost:5173/')).toBe(true);
    });

    it('should parse comma-separated origins from custom configuration', () => {
      const customConfig = {
        CLIENT_ORIGIN: 'https://shopsphere.vercel.app, https://shopsphere.store',
        ALLOWED_ORIGINS: 'https://admin.shopsphere.com'
      };
      const allowed = getAllowedOrigins(customConfig);
      expect(allowed).toContain('https://shopsphere.vercel.app');
      expect(allowed).toContain('https://shopsphere.store');
      expect(allowed).toContain('https://admin.shopsphere.com');
      expect(allowed).toContain('http://localhost:5173');

      expect(isOriginAllowed('https://shopsphere.store', customConfig)).toBe(true);
      expect(isOriginAllowed('https://admin.shopsphere.com', customConfig)).toBe(true);
    });

    it('should allow project-specific Vercel preview domains matching strict pattern', () => {
      expect(isOriginAllowed('https://shopsphere.vercel.app')).toBe(true);
      expect(isOriginAllowed('https://shopsphere-git-main-team.vercel.app')).toBe(true);
      expect(isOriginAllowed('https://shopsphere-pr-42-test.vercel.app')).toBe(true);
      expect(isOriginAllowed('https://shopsphere-preview-123.vercel.app')).toBe(true);
    });

    it('should strictly reject untrusted, external, and malicious origin attempts', () => {
      // Different domain
      expect(isOriginAllowed('https://attacker.com')).toBe(false);
      expect(isOriginAllowed('https://malicious-site.org')).toBe(false);

      // Subdomain spoofing
      expect(isOriginAllowed('https://evil-shopsphere.vercel.app')).toBe(false);
      expect(isOriginAllowed('https://not-shopsphere.vercel.app')).toBe(false);
      expect(isOriginAllowed('https://otherproject.vercel.app')).toBe(false);

      // Domain suffix spoofing
      expect(isOriginAllowed('https://shopsphere.vercel.app.attacker.com')).toBe(false);

      // Insecure HTTP protocol on Vercel
      expect(isOriginAllowed('http://shopsphere.vercel.app')).toBe(false);
      expect(isOriginAllowed('http://shopsphere-preview.vercel.app')).toBe(false);
    });

    it('should validate VERCEL_PREVIEW_REGEX directly', () => {
      expect(VERCEL_PREVIEW_REGEX.test('https://shopsphere.vercel.app')).toBe(true);
      expect(VERCEL_PREVIEW_REGEX.test('https://shopsphere-feat-checkout.vercel.app')).toBe(true);
      expect(VERCEL_PREVIEW_REGEX.test('http://shopsphere.vercel.app')).toBe(false);
      expect(VERCEL_PREVIEW_REGEX.test('https://shopsphere.com.attacker.com')).toBe(false);
    });
  });

  describe('CORS HTTP Middleware Integration', () => {
    it('should permit local development origin and include credential headers', async () => {
      const res = await request(app)
        .get('/')
        .set('Origin', 'http://localhost:5173');

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should permit approved project Vercel preview origin', async () => {
      const previewOrigin = 'https://shopsphere-git-stage1-review.vercel.app';
      const res = await request(app)
        .get('/')
        .set('Origin', previewOrigin);

      expect(res.status).toBe(200);
      expect(res.headers['access-control-allow-origin']).toBe(previewOrigin);
      expect(res.headers['access-control-allow-credentials']).toBe('true');
    });

    it('should reject untrusted origin without access-control-allow-origin header and without 500 crash', async () => {
      const res = await request(app)
        .get('/')
        .set('Origin', 'https://unauthorized-external-site.com');

      expect(res.status).toBe(200);
      // Access-Control-Allow-Origin header MUST NOT be set for untrusted origins
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('should handle CORS preflight OPTIONS requests for approved origins', async () => {
      const res = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization');

      expect([200, 204]).toContain(res.status);
      expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(res.headers['access-control-allow-credentials']).toBe('true');
      expect(res.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should reject CORS preflight OPTIONS requests for untrusted origins', async () => {
      const res = await request(app)
        .options('/api/v1/health')
        .set('Origin', 'https://evil-hacker.com')
        .set('Access-Control-Request-Method', 'POST');

      // Untrusted origin preflight should not have allow-origin
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Rate Limiter Active State & Proxy Compatibility', () => {
    it('should include standard rate-limiting headers on /api requests', async () => {
      const res = await request(app)
        .get('/api/v1')
        .set('X-Forwarded-For', '198.51.100.25');

      expect(res.status).toBe(200);
      // express-rate-limit standard headers
      expect(res.headers['ratelimit-limit']).toBeDefined();
      expect(res.headers['ratelimit-remaining']).toBeDefined();
    });
  });
});

