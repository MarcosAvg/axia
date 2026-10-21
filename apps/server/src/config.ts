import { z } from 'zod'

const booleanString = z
  .string()
  .default('false')
  .pipe(z.enum(['true', 'false', '1', '0']))
  .transform((value) => value === 'true' || value === '1')

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  HOST: z.string().min(1).default('0.0.0.0'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
  DATABASE_URL: z
    .string()
    .refine(
      (value) => /^postgres(ql)?:\/\//.test(value),
      'DATABASE_URL must use postgres:// or postgresql://',
    ),
  STATIC_DIR: z.string().min(1).optional(),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  TRUST_PROXY: booleanString,
  BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(1_048_576),
  STORAGE_DIR: z.string().min(1).default('./data/evidence'),
  EVIDENCE_MAX_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(20 * 1024 * 1024),
  EVIDENCE_MAX_DIMENSION: z.coerce
    .number()
    .int()
    .min(320)
    .max(16_384)
    .default(4_096),
  EVIDENCE_THUMBNAIL_SIZE: z.coerce
    .number()
    .int()
    .min(64)
    .max(1_024)
    .default(320),
  EVIDENCE_QUOTA_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(500 * 1024 * 1024),
  HEALTH_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30_000)
    .default(2_000),
  SHUTDOWN_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1_000)
    .max(60_000)
    .default(10_000),
  SESSION_COOKIE_NAME: z.string().min(1).default('axia_session'),
  SESSION_ABSOLUTE_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 365)
    .default(24 * 7),
  SESSION_IDLE_TTL_HOURS: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 30)
    .default(24),
  SESSION_TOUCH_INTERVAL_SECONDS: z.coerce
    .number()
    .int()
    .min(0)
    .max(3_600)
    .default(60),
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(100).default(5),
  LOGIN_MAX_IP_ATTEMPTS: z.coerce.number().int().min(1).max(1_000).default(20),
  LOGIN_WINDOW_MINUTES: z.coerce.number().int().min(1).max(1_440).default(15),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(8).max(128).default(12),
})

export type AppConfig = z.infer<typeof environmentSchema> & {
  isProduction: boolean
}

export function loadConfig(
  source: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env,
): AppConfig {
  const parsed = environmentSchema.safeParse(source)

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
      .join('; ')
    throw new Error(`Invalid environment configuration: ${details}`)
  }

  return {
    ...parsed.data,
    isProduction: parsed.data.NODE_ENV === 'production',
  }
}
