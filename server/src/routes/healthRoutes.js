import { Router } from 'express';
import mongoose from 'mongoose';
import config from '../config/env.js';
import { getDBStatus } from '../config/database.js';

const router = Router();

export const getHealthStatus = (req, res) => {
  const dbStatus = getDBStatus();
  const isHealthy = dbStatus.connected;
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    success: isHealthy,
    data: {
      status: isHealthy ? 'healthy' : 'unhealthy',
      isReady: isHealthy,
      service: 'ShopSphere Core API',
      version: '1.0.0',
      environment: config.NODE_ENV,
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus.status,
        connected: dbStatus.connected,
        name: dbStatus.name
      },
      integrations: {
        razorpay: config.RAZORPAY_KEY_ID && !config.RAZORPAY_KEY_ID.includes('placeholder')
          ? 'configured'
          : 'test_placeholder',
        cloudinary: config.CLOUDINARY_CLOUD_NAME && !config.CLOUDINARY_CLOUD_NAME.includes('placeholder')
          ? 'configured'
          : 'test_placeholder'
      }
    }
  });
};

router.get('/health', getHealthStatus);
router.get('/api/health', getHealthStatus);
router.get('/api/v1/health', getHealthStatus);

export default router;
