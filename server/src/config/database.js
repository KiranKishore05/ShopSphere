import mongoose from 'mongoose';
import config from './env.js';

let isConnecting = false;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (isConnecting) {
    return;
  }

  isConnecting = true;

  // Mask credentials in logs
  const maskedUri = config.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');

  try {
    console.log(`📡 Connecting to MongoDB at ${maskedUri}...`);
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: config.NODE_ENV !== 'production',
    });
    console.log(`✅ MongoDB connected successfully to database: ${conn.connection.name}`);
    isConnecting = false;
    return conn;
  } catch (error) {
    isConnecting = false;
    console.warn(`⚠️ MongoDB connection warning: ${error.message}`);
    if (config.NODE_ENV === 'production') {
      console.error('❌ Critical: Database connection failed in production. Terminating process.');
      process.exit(1);
    }
  }
};

export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close(false);
    console.log('📦 MongoDB connection closed gracefully.');
  }
};

export const isDBConnected = () => mongoose.connection.readyState === 1;

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

export default connectDB;
