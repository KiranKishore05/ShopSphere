import config from '../config/env.js';

/**
 * Strict regex for project-specific Vercel preview deployments.
 * Matches:
 *   https://shopsphere.vercel.app
 *   https://shopsphere-<branch-or-hash>-<team>.vercel.app
 * Rejects:
 *   http:// (non-SSL), other Vercel projects (https://other.vercel.app),
 *   arbitrary prefix attacks (https://evil-shopsphere.vercel.app),
 *   subdomain/suffix attacks (https://shopsphere.vercel.app.attacker.com).
 */
export const VERCEL_PREVIEW_REGEX = /^https:\/\/shopsphere(-[a-zA-Z0-9_-]+)*\.vercel\.app$/;

/**
 * Parses and returns a deduplicated array of explicitly allowed origin strings.
 */
export const getAllowedOrigins = (customConfig = null) => {
  const nodeEnv = customConfig?.NODE_ENV ?? config.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  const clientOriginSource = customConfig?.CLIENT_ORIGIN ?? config.CLIENT_ORIGIN ?? '';
  const allowedOriginsSource = customConfig?.ALLOWED_ORIGINS ?? config.ALLOWED_ORIGINS ?? '';

  const rawOrigins = [
    ...clientOriginSource.split(','),
    ...allowedOriginsSource.split(',')
  ];

  // In production, do not include local development origins
  const localDefaults = isProd
    ? []
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173'
      ];

  const normalized = [...rawOrigins, ...localDefaults]
    .map(o => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  return Array.from(new Set(normalized));
};

/**
 * Validates whether an incoming Origin header is permitted.
 */
export const isOriginAllowed = (origin, customConfig = null) => {
  // Allow server-to-server, health check, webhook, or curl requests with no origin
  if (!origin) return true;

  const nodeEnv = customConfig?.NODE_ENV ?? config.NODE_ENV ?? 'development';
  const isProd = nodeEnv === 'production';

  let normalized;
  try {
    const parsed = new URL(origin);
    // Reject non-http/https protocols or null origin
    if (parsed.origin === 'null' || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) {
      return false;
    }
    normalized = parsed.origin;
  } catch {
    normalized = origin.trim().replace(/\/+$/, '');
  }

  const allowedList = getAllowedOrigins(customConfig);

  // 1. Direct match in explicitly configured allowed origins
  if (allowedList.includes(normalized)) {
    return true;
  }

  // 2. Strict project-specific Vercel preview pattern (DISABLED in production)
  if (!isProd && VERCEL_PREVIEW_REGEX.test(normalized)) {
    return true;
  }

  return false;
};

export default {
  VERCEL_PREVIEW_REGEX,
  getAllowedOrigins,
  isOriginAllowed
};

