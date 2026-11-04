import app from './app.js';
import config from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';

let server;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start HTTP Listener
  server = app.listen(config.PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 ShopSphere Server running in [${config.NODE_ENV}] mode`);
    console.log(`🌐 Local URL:   http://localhost:${config.PORT}`);
    console.log(`🩺 Health API:  http://localhost:${config.PORT}/api/v1/health`);
    console.log(`======================================================\n`);
  });
};

// Graceful Process Termination
const handleShutdown = async (signal) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log('🔒 HTTP server closed.');
      try {
        await disconnectDB();
      } catch (err) {
        console.error('Error closing DB connections:', err);
      }
      process.exit(0);
    });

    // Force exit if hanging
    setTimeout(() => {
      console.error('⚠️ Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

startServer();
