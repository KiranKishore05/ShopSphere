import app from './app.js';
import config from './config/env.js';
import { connectDB, disconnectDB } from './config/database.js';
import { startEmailWorker, stopEmailWorker } from './services/email/emailWorker.js';

let server;
let isWorkerStarted = false;

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start Background Outbox Worker (non-test environments when enabled)
  if (config.NODE_ENV !== 'test' && config.EMAIL_WORKER_ENABLED) {
    startEmailWorker();
    isWorkerStarted = true;
    console.log(`📬 Transactional Email Outbox Worker active [Provider: ${config.EMAIL_PROVIDER}]`);
  } else if (config.NODE_ENV !== 'test') {
    console.log(`📬 Transactional Email Outbox Worker disabled (EMAIL_WORKER_ENABLED=false)`);
  }

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

  // Stop background email worker if it was started
  if (isWorkerStarted) {
    try {
      await stopEmailWorker({ timeoutMs: 5000 });
      console.log('📬 Email Outbox Worker stopped.');
    } catch (err) {
      console.error('Error stopping Email Worker:', err.message);
    }
  }

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
