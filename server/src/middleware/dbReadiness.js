import mongoose from 'mongoose';

/**
 * Middleware to verify MongoDB connectivity before database-dependent operations.
 * Returns an immediate HTTP 503 response when MongoDB is not connected (readyState !== 1),
 * preventing requests from buffering in memory and timing out after several seconds.
 */
export const checkDbReadiness = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    const isConnecting = mongoose.connection.readyState === 2;
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: isConnecting
          ? 'Database connection is currently establishing. Please retry shortly.'
          : 'Database service is currently unavailable. Cannot process database operations.',
        details: [
          {
            field: 'database',
            issue: isConnecting
              ? 'Database state: connecting (readyState: 2)'
              : 'Database state: disconnected (readyState: 0)'
          }
        ]
      }
    });
  }
  next();
};

export default checkDbReadiness;
