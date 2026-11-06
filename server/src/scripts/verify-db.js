import mongoose from 'mongoose';
import config from '../config/env.js';
import { maskMongoUri, validateMongoUri } from '../config/database.js';

const testConnection = async () => {
  const maskedUri = maskMongoUri(config.MONGODB_URI);
  const validation = validateMongoUri(config.MONGODB_URI);

  console.log('======================================================');
  console.log('🔍 SHOPSPHERE DATABASE CONNECTION DIAGNOSTIC TOOL');
  console.log('======================================================');
  console.log(`URI Scheme:     ${config.MONGODB_URI.split('://')[0]}://`);
  console.log(`Masked Target:  ${maskedUri}`);
  console.log(`Target Type:    ${validation.isAtlas ? 'MongoDB Atlas Cluster (Remote)' : 'Local MongoDB (Standalone)'}`);
  console.log(`Format Status:  ${validation.valid ? '✅ Valid' : '❌ ' + validation.message}`);

  if (!validation.valid) {
    console.error('\n❌ Connection aborted due to invalid URI configuration.');
    process.exit(1);
  }

  const startTime = Date.now();
  try {
    console.log('\n📡 Attempting connection (timeout: 5000ms)...');
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ SUCCESS: Connected in ${elapsed}ms!`);
    console.log(`   Database Name: ${conn.connection.name}`);
    console.log(`   Cluster Host:  ${conn.connection.host}`);
    console.log(`   Connection:    ReadyState 1 (CONNECTED)`);

    // Ping the admin database
    const adminDb = conn.connection.db.admin();
    const pingResult = await adminDb.ping();
    console.log(`   Ping Result:   ${JSON.stringify(pingResult)}`);

    await mongoose.connection.close();
    console.log('\n✨ Database connection verified and closed cleanly.');
    console.log('======================================================\n');
    process.exit(0);
  } catch (error) {
    const elapsed = Date.now() - startTime;
    console.error(`\n❌ CONNECTION FAILED after ${elapsed}ms:`);
    console.error(`   Error Name:    ${error.name}`);
    console.error(`   Error Message: ${error.message}`);

    if (error.message.includes('bad auth') || error.message.includes('Authentication failed')) {
      console.error('\n💡 HINT: Authentication failed. Please check your username and password in MONGODB_URI.');
    } else if (error.message.includes('querySrv ENOTFOUND') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 HINT: Cluster hostname not found. Check the cluster address in your connection string.');
    } else if (error.message.includes('timed out') || error.message.includes('ECONNREFUSED')) {
      if (validation.isAtlas) {
        console.error('\n💡 HINT: Atlas connection timed out. Ensure your IP address is allowlisted in Atlas (Network Access -> Add IP -> 0.0.0.0/0 or your current IP).');
      } else {
        console.error('\n💡 HINT: Local MongoDB service is not running on port 27017.');
      }
    }
    console.log('======================================================\n');
    process.exit(1);
  }
};

testConnection();

