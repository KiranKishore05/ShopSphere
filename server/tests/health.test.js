import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';

describe('Server Health & Gateway Tests', () => {
  it('GET / should return gateway welcome metadata', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toContain('ShopSphere');
  });

  it('GET /api/v1/health should accurately report healthy (200) when database is connected', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.isReady).toBe(true);
    expect(res.body.data.service).toBe('ShopSphere Core API');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.database.connected).toBe(true);

    vi.restoreAllMocks();
  });

  it('GET /api/v1/health should accurately report unhealthy (503) when database is disconnected', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(0);

    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('unhealthy');
    expect(res.body.data.isReady).toBe(false);
    expect(res.body.data.database.connected).toBe(false);

    vi.restoreAllMocks();
  });

  it('GET /api/health should alias to health status endpoint', async () => {
    vi.spyOn(mongoose.connection, 'readyState', 'get').mockReturnValue(1);

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');

    vi.restoreAllMocks();
  });

  it('GET /api/v1/unknown-endpoint should return standard 404 error envelope', async () => {
    const res = await request(app).get('/api/v1/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});
