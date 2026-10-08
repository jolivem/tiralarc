import { z } from 'zod';

const commaSeparated = z
  .string()
  .default('')
  .transform((value) =>
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  );

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().startsWith('mysql://'),
  CORS_ORIGINS: commaSeparated,
  /**
   * Express `trust proxy` setting: which hops may set X-Forwarded-For, so that
   * rate limiting sees the real client IP behind the Next.js BFF / load balancer.
   * Examples: "loopback", "loopback, 10.0.0.0/8", "1" (number of hops), "false".
   */
  TRUST_PROXY: z
    .string()
    .default('loopback')
    .transform((value): boolean | number | string => {
      if (value === 'true' || value === 'false') return value === 'true';
      return /^\d+$/.test(value) ? Number(value) : value;
    }),
  JWT_ACCESS_SECRET: z.string().min(32),
  /** Access token lifetime, in seconds. */
  JWT_ACCESS_TTL: z.coerce.number().int().positive().default(900),
  /** Refresh token lifetime, in seconds. */
  JWT_REFRESH_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24 * 30),
  /** Public URL of the web app, used to build links in emails. */
  WEB_URL: z.url().default('http://localhost:3000'),
  /** SMTP connection string, e.g. smtp://localhost:1025 (Mailpit in dev) or smtps://user:pass@host:465. */
  SMTP_URL: z.string().default('smtp://localhost:1025'),
  MAIL_FROM: z.string().default('Tiralarc <no-reply@tiralarc.local>'),
  /** Email verification link lifetime, in seconds. */
  EMAIL_VERIFICATION_TTL: z.coerce
    .number()
    .int()
    .positive()
    .default(60 * 60 * 24),
  /**
   * Accepted audiences for Google ID tokens: comma-separated OAuth client IDs
   * (web, Android, iOS). Empty = Google sign-in disabled.
   */
  GOOGLE_CLIENT_IDS: commaSeparated,
  /**
   * Accepted audiences for Apple identity tokens: the Services ID (web) and the
   * app bundle ID (iOS). Empty = Apple sign-in disabled.
   */
  APPLE_CLIENT_IDS: commaSeparated,
  /**
   * Object storage for photos (any S3-compatible service). The defaults match the local
   * gateway of docker-compose; production must set its own endpoint, bucket and keys.
   */
  S3_ENDPOINT: z.url().default('http://localhost:9000'),
  S3_REGION: z.string().default('us-east-1'),
  S3_BUCKET: z.string().default('tiralarc'),
  S3_ACCESS_KEY: z.string().default('tiralarc'),
  S3_SECRET_KEY: z.string().default('tiralarc-secret'),
  /** Path-style URLs (endpoint/bucket/key): needed by local gateways and some providers. */
  S3_FORCE_PATH_STYLE: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule: fails fast at boot when the environment is invalid. */
export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
