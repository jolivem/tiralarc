import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().startsWith('mysql://'),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
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
