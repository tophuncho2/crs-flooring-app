import { z } from "zod"

function parseOptionalBooleanFlag(label: string, value: string | undefined) {
  if (!value) {
    return undefined
  }

  const normalized = value.trim().toLowerCase()
  if (normalized === "true") {
    return true
  }
  if (normalized === "false") {
    return false
  }

  throw new Error(`${label} must be either "true" or "false" when provided`)
}

function normalizeBasePath(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return "/admin/queues"
  }

  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`
  return withLeadingSlash.replace(/\/+$/, "") || "/admin/queues"
}

const relayEnvironmentSchema = z.object({
  QUEUE_REDIS_URL: z.string().url("QUEUE_REDIS_URL must be a valid URL").optional(),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
  RELAY_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  RELAY_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  RELAY_CLAIM_TTL_MS: z.coerce.number().int().positive().default(30_000),
  RELAY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  // BullMQ job policy for the materialize queue. The relay is where jobs are
  // ENQUEUED, so worker-retry policy is configured here, not in the worker.
  // Retries are safe because the worker is idempotent via subset-materialize.
  MATERIALIZE_JOB_ATTEMPTS: z.coerce.number().int().positive().default(5),
  MATERIALIZE_JOB_BACKOFF_MS: z.coerce.number().int().positive().default(5_000),
  // Retain recent completed/failed jobs (count-based) — failed kept generously
  // so terminal dead-letters stay inspectable in Bull Board.
  MATERIALIZE_JOB_REMOVE_ON_COMPLETE: z.coerce.number().int().nonnegative().default(1_000),
  MATERIALIZE_JOB_REMOVE_ON_FAIL: z.coerce.number().int().nonnegative().default(5_000),
  BULL_BOARD_ENABLED: z.string().optional(),
  BULL_BOARD_HOST: z.string().min(1).optional(),
  BULL_BOARD_PORT: z.coerce.number().int().positive().optional(),
  BULL_BOARD_BASE_PATH: z.string().min(1).optional(),
  BULL_BOARD_USERNAME: z.string().min(1).optional(),
  BULL_BOARD_PASSWORD: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().optional(),
  RAILWAY_ENVIRONMENT_NAME: z.string().min(1).optional(),
  RAILWAY_SERVICE_NAME: z.string().min(1).optional(),
}).superRefine((env, context) => {
  if (!env.QUEUE_REDIS_URL && !env.REDIS_URL) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "QUEUE_REDIS_URL is required",
      path: ["QUEUE_REDIS_URL"],
    })
  }
})

export type RelayEnvironment = {
  queueRedisUrl: string
  batchSize: number
  pollIntervalMs: number
  claimTtlMs: number
  maxAttempts: number
  materializeJob: {
    attempts: number
    backoffMs: number
    removeOnComplete: number
    removeOnFail: number
  }
  bullBoard: {
    enabled: boolean
    host: string
    port: number
    basePath: string
    username: string | null
    password: string | null
  }
  environmentName: string
  serviceName: string
}

export function getRelayEnvironment(source: NodeJS.ProcessEnv = process.env): RelayEnvironment {
  const parsed = relayEnvironmentSchema.parse({
    QUEUE_REDIS_URL: source.QUEUE_REDIS_URL,
    REDIS_URL: source.REDIS_URL,
    RELAY_BATCH_SIZE: source.RELAY_BATCH_SIZE,
    RELAY_POLL_INTERVAL_MS: source.RELAY_POLL_INTERVAL_MS,
    RELAY_CLAIM_TTL_MS: source.RELAY_CLAIM_TTL_MS,
    RELAY_MAX_ATTEMPTS: source.RELAY_MAX_ATTEMPTS,
    MATERIALIZE_JOB_ATTEMPTS: source.MATERIALIZE_JOB_ATTEMPTS,
    MATERIALIZE_JOB_BACKOFF_MS: source.MATERIALIZE_JOB_BACKOFF_MS,
    MATERIALIZE_JOB_REMOVE_ON_COMPLETE: source.MATERIALIZE_JOB_REMOVE_ON_COMPLETE,
    MATERIALIZE_JOB_REMOVE_ON_FAIL: source.MATERIALIZE_JOB_REMOVE_ON_FAIL,
    BULL_BOARD_ENABLED: source.BULL_BOARD_ENABLED,
    BULL_BOARD_HOST: source.BULL_BOARD_HOST,
    BULL_BOARD_PORT: source.BULL_BOARD_PORT,
    BULL_BOARD_BASE_PATH: source.BULL_BOARD_BASE_PATH,
    BULL_BOARD_USERNAME: source.BULL_BOARD_USERNAME,
    BULL_BOARD_PASSWORD: source.BULL_BOARD_PASSWORD,
    PORT: source.PORT,
    RAILWAY_ENVIRONMENT_NAME: source.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_SERVICE_NAME: source.RAILWAY_SERVICE_NAME,
  })

  const environmentName = parsed.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development"
  const bullBoardEnabled = parseOptionalBooleanFlag("BULL_BOARD_ENABLED", parsed.BULL_BOARD_ENABLED) ?? environmentName === "development"
  const bullBoardUsername = parsed.BULL_BOARD_USERNAME ?? null
  const bullBoardPassword = parsed.BULL_BOARD_PASSWORD ?? null

  if (bullBoardEnabled && environmentName !== "development" && (!bullBoardUsername || !bullBoardPassword)) {
    throw new Error("BULL_BOARD_USERNAME and BULL_BOARD_PASSWORD are required when Bull Board is enabled outside development")
  }

  return {
    queueRedisUrl: parsed.QUEUE_REDIS_URL ?? parsed.REDIS_URL!,
    batchSize: parsed.RELAY_BATCH_SIZE,
    pollIntervalMs: parsed.RELAY_POLL_INTERVAL_MS,
    claimTtlMs: parsed.RELAY_CLAIM_TTL_MS,
    maxAttempts: parsed.RELAY_MAX_ATTEMPTS,
    materializeJob: {
      attempts: parsed.MATERIALIZE_JOB_ATTEMPTS,
      backoffMs: parsed.MATERIALIZE_JOB_BACKOFF_MS,
      removeOnComplete: parsed.MATERIALIZE_JOB_REMOVE_ON_COMPLETE,
      removeOnFail: parsed.MATERIALIZE_JOB_REMOVE_ON_FAIL,
    },
    bullBoard: {
      enabled: bullBoardEnabled,
      host: parsed.BULL_BOARD_HOST ?? "0.0.0.0",
      port: parsed.BULL_BOARD_PORT ?? parsed.PORT ?? 3011,
      basePath: normalizeBasePath(parsed.BULL_BOARD_BASE_PATH),
      username: bullBoardUsername,
      password: bullBoardPassword,
    },
    environmentName,
    serviceName: parsed.RAILWAY_SERVICE_NAME ?? "builders-relay",
  }
}
