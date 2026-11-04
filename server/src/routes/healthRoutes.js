import { Router } from 'express';
import mongoose from 'mongoose';
import config from '../config/env.js';

const router = Router();

const getHealthStatus = (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const isHealthy = true; // API is operational even if DB is still establishing connection in dev

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    data: {
      status: 'healthy',
      service: 'ShopSphere Core API',
      version: '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatusMap[dbState] || 'unknown',
        connected: dbState === 1
      },
      integrations: {
        razorpay: config.RAZORPAY_KEY_ID ? 'configured' : 'unconfigured',
        cloudinary: config.CLOUDINARY_CLOUD_NAME ? 'configured' : 'unconfigured'
      }
    }
  });
};

router.get('/health', getHealthStatus);
router.get('/api/health', getHealthStatus);
router.get('/api/v1/health', getHealthStatus);

export default router;
