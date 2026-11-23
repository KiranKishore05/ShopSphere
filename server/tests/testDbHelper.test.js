import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getDatabaseNameFromUri,
  getHostFromUri,
  maskMongoUri,
  validateTestUriSafety,
  resolveTestMongoUri,
  connectTestDB
} from './helpers/testDb.js';

describe('Test Database Configuration & Safety Helper', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getDatabaseNameFromUri', () => {
    it('should correctly extract database name from mongodb:// URI', () => {
      expect(getDatabaseNameFromUri('mongodb://127.0.0.1:27017/shopsphere_test')).toBe('shopsphere_test');
      expect(getDatabaseNameFromUri('mongodb://localhost:27017/my_custom_db_test?authSource=admin')).toBe('my_custom_db_test');
    });

    it('should correctly extract database name from mongodb+srv:// URI', () => {
      expect(getDatabaseNameFromUri('mongodb+srv://user:pass@cluster0.abc.mongodb.net/shopsphere?retryWrites=true')).toBe('shopsphere');
      expect(getDatabaseNameFromUri('mongodb+srv://user:pass@cluster0.abc.mongodb.net/shopsphere_test?retryWrites=true')).toBe('shopsphere_test');
    });

    it('should normalize database names with trailing slashes', () => {
      expect(getDatabaseNameFromUri('mongodb://127.0.0.1:27017/shopsphere_test/')).toBe('shopsphere_test');
      expect(getDatabaseNameFromUri('mongodb+srv://user:pass@cluster0.abc.mongodb.net/shopsphere/?retryWrites=true')).toBe('shopsphere');
    });

    it('should return empty string for missing, empty, or root-only URI path', () => {
      expect(getDatabaseNameFromUri('')).toBe('');
      expect(getDatabaseNameFromUri(null)).toBe('');
      expect(getDatabaseNameFromUri('mongodb://localhost:27017/')).toBe('');
      expect(getDatabaseNameFromUri('mongodb+srv://user:pass@cluster0.abc.mongodb.net/?retryWrites=true')).toBe('');
    });
  });

  describe('getHostFromUri', () => {
    it('should correctly extract host and port from mongodb:// URI', () => {
      expect(getHostFromUri('mongodb://127.0.0.1:27017/shopsphere_test')).toBe('127.0.0.1:27017');
      expect(getHostFromUri('mongodb://localhost:27017/shopsphere_test')).toBe('localhost:27017');
    });

    it('should correctly extract cluster host from mongodb+srv:// URI', () => {
      expect(getHostFromUri('mongodb+srv://user:pass@cluster0.abc.mongodb.net/shopsphere?retryWrites=true')).toBe('cluster0.abc.mongodb.net');
      expect(getHostFromUri('mongodb+srv://user:pass@Cluster0.Abc.MongoDB.net/shopsphere')).toBe('cluster0.abc.mongodb.net');
    });

    it('should return empty string for invalid or empty URI', () => {
      expect(getHostFromUri('')).toBe('');
      expect(getHostFromUri(null)).toBe('');
    });
  });

  describe('maskMongoUri', () => {
    it('should mask credentials in standard and srv URIs', () => {
      const masked = maskMongoUri('mongodb+srv://dbUser:SecretPassword123@cluster.mongodb.net/shopsphere');
      expect(masked).toBe('mongodb+srv://***:***@cluster.mongodb.net/shopsphere');
      expect(masked).not.toContain('dbUser');
      expect(masked).not.toContain('SecretPassword123');
    });
  });

  describe('validateTestUriSafety', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      process.env.MONGODB_URI = 'mongodb+srv://admin:pass@cluster0.mongodb.net/shopsphere?retryWrites=true';
    });

    it('should reject test URI if it matches production MONGODB_URI exactly', () => {
      expect(() => {
        validateTestUriSafety('mongodb+srv://admin:pass@cluster0.mongodb.net/shopsphere?retryWrites=true');
      }).toThrow(/matches production MONGODB_URI/);
    });

    it('should reject test URI targeting the production cluster host even with a different database name', () => {
      expect(() => {
        validateTestUriSafety('mongodb+srv://admin:pass@cluster0.mongodb.net/shopsphere_test');
      }).toThrow(/targets the production MongoDB host\/cluster/);
    });

    it('should reject test URI if it targets the production database name on another host', () => {
      expect(() => {
        validateTestUriSafety('mongodb://127.0.0.1:27017/shopsphere');
      }).toThrow(/targets the main application database/);
    });

    it('should reject test URI with trailing slash targeting production database', () => {
      expect(() => {
        validateTestUriSafety('mongodb+srv://admin:pass@cluster0.mongodb.net/shopsphere/');
      }).toThrow(/targets the production MongoDB host\/cluster/);
    });

    it('should reject test URI with missing or empty database name', () => {
      expect(() => {
        validateTestUriSafety('mongodb://127.0.0.1:27017/');
      }).toThrow(/does not specify a database name/);

      expect(() => {
        validateTestUriSafety('mongodb+srv://user:pass@testcluster.mongodb.net/?retryWrites=true');
      }).toThrow(/does not specify a database name/);
    });

    it('should reject test URI whose database name does not contain "test"', () => {
      expect(() => {
        validateTestUriSafety('mongodb://127.0.0.1:27017/my_custom_db');
      }).toThrow(/must contain "test"/);
    });

    it('should reject tests if NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(() => {
        validateTestUriSafety('mongodb://127.0.0.1:27017/shopsphere_test');
      }).toThrow(/Tests cannot be run when NODE_ENV is set to production/);
    });

    it('should never expose user passwords in thrown error messages', () => {
      const sensitiveUri = 'mongodb+srv://admin:TopSecretPassword999@cluster0.mongodb.net/shopsphere_test';
      try {
        validateTestUriSafety(sensitiveUri);
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err.message).not.toContain('TopSecretPassword999');
        expect(err.message).not.toContain('admin:');
      }
    });

    it('should allow valid isolated test database URIs on distinct test hosts', () => {
      expect(() => {
        validateTestUriSafety('mongodb://127.0.0.1:27017/shopsphere_test');
      }).not.toThrow();

      expect(() => {
        validateTestUriSafety('mongodb+srv://testUser:testPass@test-cluster.isolated.mongodb.net/shopsphere_test');
      }).not.toThrow();
    });
  });

  describe('resolveTestMongoUri', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'test';
      process.env.MONGODB_URI = 'mongodb+srv://admin:pass@cluster0.mongodb.net/shopsphere?retryWrites=true';
    });

    it('should prioritize TEST_MONGODB_URI when provided', async () => {
      process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/custom_test_db';
      process.env.MONGODB_TEST_URI = 'mongodb://127.0.0.1:27017/legacy_test_db';

      const result = await resolveTestMongoUri();
      expect(result.uri).toBe('mongodb://127.0.0.1:27017/custom_test_db');
      expect(result.source).toBe('TEST_MONGODB_URI');
    });

    it('should support legacy MONGODB_TEST_URI when TEST_MONGODB_URI is not set', async () => {
      delete process.env.TEST_MONGODB_URI;
      process.env.MONGODB_TEST_URI = 'mongodb://127.0.0.1:27017/legacy_test_db';

      const result = await resolveTestMongoUri();
      expect(result.uri).toBe('mongodb://127.0.0.1:27017/legacy_test_db');
      expect(result.source).toBe('MONGODB_TEST_URI');
    });

    it('should return uri: null (NO_TEST_DB_CONFIGURED) when test variables are missing and no memory server is usable', async () => {
      delete process.env.TEST_MONGODB_URI;
      delete process.env.MONGODB_TEST_URI;

      const result = await resolveTestMongoUri();
      expect(result.uri).toBeNull();
      expect(result.source).toBe('none');
      expect(result.isMemory).toBe(false);
    });

    it('should NEVER automatically fall back to localhost when test variables are missing', async () => {
      delete process.env.TEST_MONGODB_URI;
      delete process.env.MONGODB_TEST_URI;

      const result = await resolveTestMongoUri();
      expect(result.uri).not.toBe('mongodb://127.0.0.1:27017/shopsphere_test');
      expect(result.uri).not.toBe('mongodb://localhost:27017/shopsphere_test');
    });

    it('should NEVER fall back to production MONGODB_URI when test variables are missing', async () => {
      delete process.env.TEST_MONGODB_URI;
      delete process.env.MONGODB_TEST_URI;

      const result = await resolveTestMongoUri();
      expect(result.uri).not.toBe(process.env.MONGODB_URI);
      expect(result.uri).not.toBe('mongodb+srv://admin:pass@cluster0.mongodb.net/shopsphere?retryWrites=true');
    });
  });

  describe('connectTestDB missing configuration behavior', () => {
    it('should return connected: false with NO_TEST_DB_CONFIGURED when no test URI is configured', async () => {
      delete process.env.TEST_MONGODB_URI;
      delete process.env.MONGODB_TEST_URI;

      const result = await connectTestDB();
      expect(result.connected).toBe(false);
      expect(result.reason).toBe('NO_TEST_DB_CONFIGURED');
      expect(result.uri).toBeNull();
    });
  });
});
