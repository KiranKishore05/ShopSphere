import mongoose from 'mongoose';
import config from './env.js';

let isConnecting = false;
let reconnectTimer = null;

/**
 * Mask database credentials in connection strings for safe logging.
 */
export const maskMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
};

/**
 * Validate MongoDB URI structure and detect configuration issues.
 */
export const validateMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') {
    return { valid: false, isAtlas: false, message: 'MongoDB URI is empty or not a string.' };
  }
  const isAtlas = uri.startsWith('mongodb+srv://');
  const isStandard = uri.startsWith('mongodb://');
  if (!isAtlas && !isStandard) {
    return { valid: false, isAtlas: false, message: 'Invalid MongoDB URI scheme. Must start with mongodb:// or mongodb+srv://' };
  }
  if (isAtlas && (uri.includes('<username>') || uri.includes('<password>'))) {
    return { valid: false, isAtlas: true, message: 'MongoDB Atlas URI contains unreplaced placeholder credentials (<username>/<password>).' };
  }
  return { valid: true, isAtlas, message: 'Valid URI format' };
};

/**
 * Establish connection to MongoDB with sensible timeouts and retry behaviour.
 * Never silently swallows failures.
 */
export const connectDB = async ({ retry = true, maxRetries = 3, retryDelayMs = 3000 } = {}) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return null;
  }

  isConnecting = true;
  const maskedUri = maskMongoUri(config.MONGODB_URI);
  const uriCheck = validateMongoUri(config.MONGODB_URI);

  if (!uriCheck.valid && config.NODE_ENV !== 'test') {
    console.warn(`⚠️ MongoDB Configuration Warning: ${uriCheck.message}`);
    if (config.NODE_ENV === 'production') {
      console.error('❌ Critical: Database configuration invalid in production. Terminating process.');
      process.exit(1);
    }
  }

  const connectOptions = {
    serverSelectionTimeoutMS: config.NODE_ENV === 'test' ? 2000 : 3000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    autoIndex: config.NODE_ENV !== 'production',
  };

  let attempts = 0;
  const retriesToRun = (retry && config.NODE_ENV === 'production') ? maxRetries : 0;

  while (attempts <= retriesToRun) {
    attempts++;
    try {
      if (config.NODE_ENV !== 'test') {
        console.log(`📡 Connecting to MongoDB at ${maskedUri}... (attempt ${attempts})`);
      }
      const conn = await mongoose.connect(config.MONGODB_URI, connectOptions);
      if (config.NODE_ENV !== 'test') {
        console.log(`✅ MongoDB connected successfully to database: ${conn.connection.name}`);
      }
      isConnecting = false;
      return conn;
    } catch (error) {
      if (config.NODE_ENV !== 'test') {
        console.warn(`⚠️ MongoDB connection attempt ${attempts} failed: ${error.message}`);
      }

      if (attempts <= retriesToRun) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        isConnecting = false;
        if (config.NODE_ENV === 'production') {
          console.error('❌ Critical: Database connection failed in production after maximum retries. Terminating process.');
          process.exit(1);
        }

        // In development: Log explicit actionable instructions
        if (config.NODE_ENV === 'development') {
          console.warn('\n-----------------------------------------------------------');
          console.warn('⚠️  MONGODB DISCONNECTED — SHOPSPHERE API IN DEGRADED MODE');
          if (uriCheck.isAtlas) {
            console.warn('   Target: MongoDB Atlas Cluster');
            console.warn('   1. Verify your network IP is allowlisted in Atlas Network Access.');
            console.warn('   2. Verify username and password in server/.env MONGODB_URI.');
          } else {
            console.warn('   Target: Local MongoDB (mongodb://localhost:27017/shopsphere)');
            console.warn('   1. Start local MongoDB Windows service: net start MongoDB');
            console.warn('   2. OR start MongoDB via Docker: docker run -d -p 27017:27017 --name mongo mongo:latest');
            console.warn('   3. OR configure a MongoDB Atlas URI in server/.env:');
            console.warn('      MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/shopsphere');
          }
          console.warn('   -> Health endpoint (/api/v1/health) accurately returns 503 Unhealthy.');
          console.warn('   -> Database readiness middleware protects all data APIs with immediate 503.');
          console.warn('-----------------------------------------------------------\n');
        }
        return null;
      }
    }
  }
};

/**
 * Disconnect from MongoDB gracefully.
 */
export const disconnectDB = async () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    if (config.NODE_ENV !== 'test') {
      console.log('📦 MongoDB connection closed gracefully.');
    }
  }
};

export const isDBConnected = () => mongoose.connection.readyState === 1;

export const getDBStatus = () => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    readyState: dbState,
    status: dbStatusMap[dbState] || 'unknown',
    connected: dbState === 1,
    name: mongoose.connection.name || null,
    host: mongoose.connection.host || null
  };
};

mongoose.connection.on('disconnected', () => {
  if (config.NODE_ENV !== 'test') {
    console.warn('⚠️ MongoDB connection lost. Disconnected.');
  }
});

mongoose.connection.on('error', (err) => {
  if (config.NODE_ENV !== 'test') {
    console.error('❌ MongoDB connection error:', err.message);
  }
});

mongoose.connection.on('reconnected', () => {
  if (config.NODE_ENV !== 'test') {
    console.log('🔄 MongoDB connection re-established successfully.');
  }
});

export default connectDB;
