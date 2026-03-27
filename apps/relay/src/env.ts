import { z } from "zod"

const relayEnvironmentSchema = z.object({
  QUEUE_REDIS_URL: z.string().url("QUEUE_REDIS_URL must be a valid URL").optional(),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
  RELAY_BATCH_SIZE: z.coerce.number().int().positive().default(20),
  RELAY_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2_000),
  RELAY_CLAIM_TTL_MS: z.coerce.number().int().positive().default(30_000),
  RELAY_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
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
    RAILWAY_ENVIRONMENT_NAME: source.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_SERVICE_NAME: source.RAILWAY_SERVICE_NAME,
  })

  return {
    queueRedisUrl: parsed.QUEUE_REDIS_URL ?? parsed.REDIS_URL!,
    batchSize: parsed.RELAY_BATCH_SIZE,
    pollIntervalMs: parsed.RELAY_POLL_INTERVAL_MS,
    claimTtlMs: parsed.RELAY_CLAIM_TTL_MS,
    maxAttempts: parsed.RELAY_MAX_ATTEMPTS,
    environmentName: parsed.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development",
    serviceName: parsed.RAILWAY_SERVICE_NAME ?? "builders-relay",
  }
}
