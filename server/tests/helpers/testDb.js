import mongoose from 'mongoose';
import config from '../../src/config/env.js';

let mongodInstance = null;

/**
 * Safely parse the database name from any MongoDB connection string without exposing credentials.
 * Normalizes leading/trailing slashes and query strings.
 */
export const getDatabaseNameFromUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  try {
    const normalized = uri.replace(/^mongodb(\+srv)?:\/\//i, 'http://');
    const parsed = new URL(normalized);
    const rawPath = parsed.pathname.replace(/^\/+/, '').split('?')[0];
    const cleanDbName = rawPath.replace(/\/+$/, '').trim();
    return cleanDbName ? decodeURIComponent(cleanDbName) : '';
  } catch {
    const match = uri.match(/\/([^/?]+)(\/|\?|$)/);
    return match ? match[1].replace(/\/+$/, '').trim() : '';
  }
};

/**
 * Safely extracts the normalized host and port from a MongoDB connection string.
 */
export const getHostFromUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  try {
    const normalized = uri.replace(/^mongodb(\+srv)?:\/\//i, 'http://');
    const parsed = new URL(normalized);
    return parsed.host ? parsed.host.toLowerCase().trim() : '';
  } catch {
    const match = uri.match(/@([^/?]+)/);
    return match ? match[1].toLowerCase().trim() : '';
  }
};

/**
 * Mask database credentials in connection strings for safe logging and output.
 */
export const maskMongoUri = (uri) => {
  if (!uri || typeof uri !== 'string') return '';
  return uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
};

/**
 * Validates that candidate test URI is isolated and never targets the production database or cluster.
 * Throws an error if any safety check fails.
 */
export const validateTestUriSafety = (candidateUri) => {
  if (!candidateUri) {
    throw new Error('[Test DB Security] Execution aborted: Candidate test database URI is required.');
  }

  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'production' || config.NODE_ENV === 'production') {
    throw new Error(
      '[Test DB Security] Execution aborted: Tests cannot be run when NODE_ENV is set to production.'
    );
  }

  // 1. Validate that the candidate URI specifies a non-empty database name
  const testDbName = getDatabaseNameFromUri(candidateUri);
  if (!testDbName) {
    throw new Error(
      '[Test DB Security] Execution aborted: TEST_MONGODB_URI does not specify a database name. ' +
      'A dedicated test database name (e.g. ending in "_test") is required.'
    );
  }

  // 2. Compare with production connection settings
  const prodUri = process.env.MONGODB_URI || config.MONGODB_URI;
  if (prodUri) {
    // Exact match check (normalized)
    const normCandidate = candidateUri.trim().replace(/\/+$/, '');
    const normProd = prodUri.trim().replace(/\/+$/, '');
    if (normCandidate === normProd) {
      throw new Error(
        '[Test DB Security] Execution aborted: TEST_MONGODB_URI matches production MONGODB_URI. ' +
        'Tests must execute against an isolated test database to prevent data corruption or loss.'
      );
    }

    // Host/Cluster identity check: Reject any test URI targeting the production cluster host
    const prodHost = getHostFromUri(prodUri);
    const testHost = getHostFromUri(candidateUri);

    if (prodHost && testHost && prodHost === testHost) {
      throw new Error(
        `[Test DB Security] Execution aborted: TEST_MONGODB_URI targets the production MongoDB host/cluster ` +
        `("${testHost}"). Running tests against the production cluster is strictly prohibited, even with a different database name.`
      );
    }

    // Database name match check
    const appDbName = getDatabaseNameFromUri(prodUri);
    if (appDbName && testDbName.toLowerCase() === appDbName.toLowerCase()) {
      throw new Error(
        `[Test DB Security] Execution aborted: TEST_MONGODB_URI targets the main application database "${testDbName}". ` +
        'Test databases must have a dedicated test name (e.g., ending with "_test").'
      );
    }
  }

  // 3. Enforce test naming convention
  if (!testDbName.toLowerCase().includes('test')) {
    throw new Error(
      `[Test DB Security] Execution aborted: TEST_MONGODB_URI database name "${testDbName}" must contain "test" (e.g. ending in "_test").`
    );
  }
};

/**
 * Resolves the appropriate test database URI.
 * Priority:
 * 1. TEST_MONGODB_URI environment variable
 * 2. MONGODB_TEST_URI environment variable (legacy compatibility)
 * 3. Isolated in-memory MongoDB server (mongodb-memory-server, if installed and binary located)
 * 4. Returns uri: null (NO_TEST_DB_CONFIGURED). Never attempts automatic localhost fallback.
 *
 * NEVER falls back to production MONGODB_URI or automatic localhost.
 */
export const resolveTestMongoUri = async () => {
  const explicitTestUri = process.env.TEST_MONGODB_URI || process.env.MONGODB_TEST_URI;

  if (explicitTestUri) {
    validateTestUriSafety(explicitTestUri);
    return {
      uri: explicitTestUri.trim(),
      source: process.env.TEST_MONGODB_URI ? 'TEST_MONGODB_URI' : 'MONGODB_TEST_URI',
      isMemory: false
    };
  }

  // Attempt mongodb-memory-server if available and binary is already present on system
  try {
    const { MongoMemoryServer, DryMongoBinary } = await import('mongodb-memory-server');
    let hasBinary = false;
    if (DryMongoBinary && typeof DryMongoBinary.locateBinary === 'function') {
      const opts = await DryMongoBinary.generateOptions({});
      const located = await DryMongoBinary.locateBinary(opts);
      hasBinary = Boolean(located);
    }
    if (hasBinary) {
      if (!mongodInstance) {
        mongodInstance = await MongoMemoryServer.create();
      }
      const memUri = mongodInstance.getUri();
      return {
        uri: memUri,
        source: 'mongodb-memory-server',
        isMemory: true
      };
    }
  } catch {
    // mongodb-memory-server is not installed or binary is not present
  }

  // No test database configured. Strictly do NOT fall back to localhost or production MONGODB_URI.
  return {
    uri: null,
    source: 'none',
    isMemory: false
  };
};

/**
 * Establishes connection to the isolated test database.
 * Handles missing dependencies gracefully without crashing the runner or attempting silent connections.
 */
export const connectTestDB = async ({ serverSelectionTimeoutMS = 1500 } = {}) => {
  if (mongoose.connection.readyState === 1) {
    return { connected: true, uri: mongoose.connection.client?.s?.url || '' };
  }

  const { uri, source, isMemory } = await resolveTestMongoUri();

  if (!uri) {
    console.warn('\n' + '='.repeat(80));
    console.warn('⚠️  [Test DB Notice] Missing Test Database Configuration (NO_TEST_DB_CONFIGURED)');
    console.warn('   - Neither TEST_MONGODB_URI nor MONGODB_TEST_URI is set.');
    console.warn('   - No usable local in-memory MongoDB binary found.');
    console.warn('   - Automatic fallback to localhost or production MONGODB_URI is strictly disabled.');
    console.warn('\nSafe Setup Recommendations:');
    console.warn('   Provide an isolated test database URI via TEST_MONGODB_URI:');
    console.warn('      TEST_MONGODB_URI="mongodb://127.0.0.1:27017/shopsphere_test" npm test');
    console.warn('   Tests requiring live database connectivity will be safely skipped.');
    console.warn('='.repeat(80) + '\n');

    return { connected: false, reason: 'NO_TEST_DB_CONFIGURED', uri: null, source: 'none', isMemory: false };
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS,
      connectTimeoutMS: serverSelectionTimeoutMS,
      family: 4
    });
    return { connected: true, uri, source, isMemory };
  } catch (err) {
    const masked = maskMongoUri(uri);
    console.warn(`⚠️  [Test DB] Failed to connect to test database (${source}: ${masked}): ${err.message}`);
    return { connected: false, error: err, uri, source, isMemory };
  }
};

/**
 * Disconnects from the test database and cleans up in-memory instances.
 * Guarantees no open connections remain.
 */
export const disconnectTestDB = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  } catch (err) {
    console.error('Error during test database disconnect:', err.message);
  }

  if (mongodInstance) {
    try {
      await mongodInstance.stop();
      mongodInstance = null;
    } catch {}
  }
};
