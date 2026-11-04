import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  APP_BASE_URL: z.string().default('http://localhost:5173'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/shopsphere'),
  JWT_SECRET: z.string().default('dev_jwt_secret_shopsphere_min_32_characters_long_key'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().default('dev_cookie_secret_shopsphere_32_chars_key'),
  RAZORPAY_KEY_ID: z.string().default('rzp_test_placeholder'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_secret_placeholder'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_webhook_secret_placeholder'),
  CLOUDINARY_CLOUD_NAME: z.string().default('shopsphere-fashion'),
  CLOUDINARY_API_KEY: z.string().default('placeholder_api_key'),
  CLOUDINARY_API_SECRET: z.string().default('placeholder_api_secret'),
  ADMIN_BOOTSTRAP_KEY: z.string().default('bootstrap_secret_token_12345'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment configuration validation failed:');
  console.error(parsed.error.format());
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const config = parsed.success ? parsed.data : envSchema.parse({});
export default config;
