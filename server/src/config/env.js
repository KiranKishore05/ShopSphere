import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure server/.env is loaded whether commands run from server/ or monorepo root
const serverEnvPath = path.resolve(__dirname, '../../.env');
if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else {
  dotenv.config();
}

/**
 * Creates an environment validation schema tailored to the target runtime environment.
 * Enforces strict presence and cryptographic strength for production secrets while
 * maintaining convenient developer and test defaults for local workflows.
 */
export const createEnvSchema = (nodeEnv = process.env.NODE_ENV || 'development') => {
  const isProd = nodeEnv === 'production';

  return z.object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().default(5000),
    CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
    ALLOWED_ORIGINS: z.string().optional(),
    TRUST_PROXY: z.string().default('1'),
    APP_BASE_URL: z.string().default('http://localhost:5173'),

    MONGODB_URI: isProd
      ? z.string({ required_error: 'MONGODB_URI is required in production' })
          .min(1, 'MONGODB_URI cannot be empty')
          .refine(uri => uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://'), {
            message: 'MONGODB_URI must begin with mongodb:// or mongodb+srv://'
          })
          .refine(uri => !uri.includes('localhost') && !uri.includes('127.0.0.1'), {
            message: 'MONGODB_URI must not point to localhost in production'
          })
          .refine(uri => !uri.includes('<username>') && !uri.includes('<password>'), {
            message: 'MONGODB_URI contains unreplaced placeholder credentials (<username>/<password>)'
          })
      : z.string().default('mongodb://localhost:27017/shopsphere'),

    JWT_SECRET: isProd
      ? z.string({ required_error: 'JWT_SECRET is required in production' })
          .min(32, 'JWT_SECRET must be at least 32 characters long in production')
          .refine(s => !s.toLowerCase().includes('dev_') && !s.toLowerCase().includes('placeholder') && !s.toLowerCase().includes('change_in_production'), {
            message: 'JWT_SECRET cannot use development or placeholder secrets in production'
          })
      : z.string().default('dev_jwt_secret_shopsphere_min_32_characters_long_key'),

    JWT_EXPIRES_IN: z.string().default('7d'),

    COOKIE_SECRET: isProd
      ? z.string({ required_error: 'COOKIE_SECRET is required in production' })
          .min(32, 'COOKIE_SECRET must be at least 32 characters long in production')
          .refine(s => !s.toLowerCase().includes('dev_') && !s.toLowerCase().includes('placeholder') && !s.toLowerCase().includes('change_in_production'), {
            message: 'COOKIE_SECRET cannot use development or placeholder secrets in production'
          })
      : z.string().default('dev_cookie_secret_shopsphere_32_chars_key'),

    RAZORPAY_KEY_ID: z.string().transform(v => v || 'rzp_test_placeholder').default('rzp_test_placeholder'),
    RAZORPAY_KEY_SECRET: z.string().transform(v => v || 'rzp_secret_placeholder').default('rzp_secret_placeholder'),
    RAZORPAY_WEBHOOK_SECRET: z.string().transform(v => v || 'rzp_webhook_secret_placeholder').default('rzp_webhook_secret_placeholder'),

    CLOUDINARY_CLOUD_NAME: z.string().default('shopsphere-fashion'),
    CLOUDINARY_API_KEY: z.string().default('placeholder_api_key'),
    CLOUDINARY_API_SECRET: z.string().default('placeholder_api_secret'),

    ADMIN_BOOTSTRAP_KEY: z.string().default('bootstrap_secret_token_12345'),

    // Transactional Email Infrastructure (Phase 9 Stage 3)
    EMAIL_PROVIDER: isProd
      ? z.enum(['mock', 'brevo'], {
          errorMap: () => ({ message: "EMAIL_PROVIDER must be 'brevo' in production ('mock' is prohibited)" })
        }).refine(p => p !== 'mock', {
          message: "EMAIL_PROVIDER cannot be 'mock' in production. A real provider ('brevo') must be configured."
        })
      : z.enum(['mock', 'brevo'], {
          errorMap: () => ({ message: "EMAIL_PROVIDER must be either 'mock' or 'brevo'" })
        }).default('mock'),
    EMAIL_FROM_ADDRESS: z.string().email().default('orders@shopsphere.in'),
    EMAIL_FROM_NAME: z.string().default('ShopSphere'),
    EMAIL_SUPPORT_ADDRESS: z.string().email().default('support@shopsphere.in'),
    ADMIN_NOTIFICATION_EMAIL: z.string().email().or(z.literal('')).optional().default(''),

    BREVO_API_KEY: z.string().optional().default(''),

    EMAIL_TOKEN_SECRET: isProd
      ? z.string({ required_error: 'EMAIL_TOKEN_SECRET is required in production' })
          .min(32, 'EMAIL_TOKEN_SECRET must be at least 32 characters in production')
          .refine(s => !s.toLowerCase().includes('dev_') && !s.toLowerCase().includes('placeholder') && !s.toLowerCase().includes('change_in_production'), {
            message: 'EMAIL_TOKEN_SECRET cannot use development or placeholder secrets in production'
          })
      : z.string().default('dev_email_token_secret_shopsphere_min_32_characters_key'),

    EMAIL_WORKER_ENABLED: z.preprocess(val => {
      if (val === undefined || val === null || val === '') return true;
      if (typeof val === 'boolean') return val;
      if (typeof val === 'number') return val !== 0;
      if (typeof val === 'string') {
        const lower = val.trim().toLowerCase();
        if (lower === 'true' || lower === '1' || lower === 'yes') return true;
        if (lower === 'false' || lower === '0' || lower === 'no') return false;
      }
      return val;
    }, z.boolean({ invalid_type_error: 'EMAIL_WORKER_ENABLED must be a boolean (true/false, 1/0)' })).default(true),

    EMAIL_MAX_RETRIES: z.coerce.number().int().min(1).max(10).default(5),
    EMAIL_RETRY_DELAY_MS: z.coerce.number().int().min(100).default(1000),
    EMAIL_POLL_INTERVAL_MS: z.coerce.number().int().min(1000).default(10000),
    EMAIL_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(5),
    EMAIL_PROCESSING_LEASE_MS: z.coerce.number().int().min(10000).default(300000),
  }).superRefine((data, ctx) => {
    // If Brevo is explicitly selected as provider, ensure API key is provided
    if (data.EMAIL_PROVIDER === 'brevo' && (!data.BREVO_API_KEY || data.BREVO_API_KEY === 'placeholder_api_key' || data.BREVO_API_KEY.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'BREVO_API_KEY is required and must not be empty or placeholder when EMAIL_PROVIDER is set to "brevo"',
        path: ['BREVO_API_KEY']
      });
    }
  });
};

/**
 * Validates arbitrary environment variables without exposing secret values.
 * Returns { valid: boolean, errors: Array<{ field: string, message: string }>, data: object | null }
 */
export const validateEnv = (rawEnv = process.env) => {
  const nodeEnv = rawEnv.NODE_ENV || 'development';
  const schema = createEnvSchema(nodeEnv);
  const result = schema.safeParse(rawEnv);

  if (!result.success) {
    const formattedErrors = result.error.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return { valid: false, errors: formattedErrors, data: null };
  }

  return { valid: true, errors: [], data: result.data };
};

// Validate current runtime environment
const validation = validateEnv(process.env);

if (!validation.valid) {
  console.error('❌ Environment configuration validation failed:');
  validation.errors.forEach(err => {
    console.error(`   - ${err.field}: ${err.message}`);
  });
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Production configuration error: ${validation.errors.map(e => `${e.field} (${e.message})`).join(', ')}`
    );
  }
}

export const config = validation.valid ? validation.data : createEnvSchema('development').parse({});
export default config;
