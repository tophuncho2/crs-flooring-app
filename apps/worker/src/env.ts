import { z } from "zod"

const workerEnvironmentSchema = z.object({
  QUEUE_REDIS_URL: z.string().url("QUEUE_REDIS_URL must be a valid URL").optional(),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
  MATERIALIZE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  MATERIALIZE_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(60_000),
  PENDING_SAVE_CUT_LOG_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  PENDING_SAVE_CUT_LOG_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(60_000),
  FINALIZE_CUT_LOG_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(60_000),
  VOID_CUT_LOG_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  VOID_CUT_LOG_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(60_000),
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

export type WorkerEnvironment = {
  queueRedisUrl: string
  materializeWorkerConcurrency: number
  materializeWorkerLockDurationMs: number
  pendingSaveCutLogWorkerConcurrency: number
  pendingSaveCutLogWorkerLockDurationMs: number
  finalizeCutLogWorkerConcurrency: number
  finalizeCutLogWorkerLockDurationMs: number
  voidCutLogWorkerConcurrency: number
  voidCutLogWorkerLockDurationMs: number
  environmentName: string
  serviceName: string
}

export function getWorkerEnvironment(source: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  const parsed = workerEnvironmentSchema.parse({
    QUEUE_REDIS_URL: source.QUEUE_REDIS_URL,
    REDIS_URL: source.REDIS_URL,
    MATERIALIZE_WORKER_CONCURRENCY: source.MATERIALIZE_WORKER_CONCURRENCY,
    MATERIALIZE_WORKER_LOCK_DURATION_MS: source.MATERIALIZE_WORKER_LOCK_DURATION_MS,
    PENDING_SAVE_CUT_LOG_WORKER_CONCURRENCY: source.PENDING_SAVE_CUT_LOG_WORKER_CONCURRENCY,
    PENDING_SAVE_CUT_LOG_WORKER_LOCK_DURATION_MS:
      source.PENDING_SAVE_CUT_LOG_WORKER_LOCK_DURATION_MS,
    FINALIZE_CUT_LOG_WORKER_CONCURRENCY: source.FINALIZE_CUT_LOG_WORKER_CONCURRENCY,
    FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS: source.FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS,
    VOID_CUT_LOG_WORKER_CONCURRENCY: source.VOID_CUT_LOG_WORKER_CONCURRENCY,
    VOID_CUT_LOG_WORKER_LOCK_DURATION_MS: source.VOID_CUT_LOG_WORKER_LOCK_DURATION_MS,
    RAILWAY_ENVIRONMENT_NAME: source.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_SERVICE_NAME: source.RAILWAY_SERVICE_NAME,
  })

  return {
    queueRedisUrl: parsed.QUEUE_REDIS_URL ?? parsed.REDIS_URL!,
    materializeWorkerConcurrency: parsed.MATERIALIZE_WORKER_CONCURRENCY,
    materializeWorkerLockDurationMs: parsed.MATERIALIZE_WORKER_LOCK_DURATION_MS,
    pendingSaveCutLogWorkerConcurrency: parsed.PENDING_SAVE_CUT_LOG_WORKER_CONCURRENCY,
    pendingSaveCutLogWorkerLockDurationMs: parsed.PENDING_SAVE_CUT_LOG_WORKER_LOCK_DURATION_MS,
    finalizeCutLogWorkerConcurrency: parsed.FINALIZE_CUT_LOG_WORKER_CONCURRENCY,
    finalizeCutLogWorkerLockDurationMs: parsed.FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS,
    voidCutLogWorkerConcurrency: parsed.VOID_CUT_LOG_WORKER_CONCURRENCY,
    voidCutLogWorkerLockDurationMs: parsed.VOID_CUT_LOG_WORKER_LOCK_DURATION_MS,
    environmentName: parsed.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development",
    serviceName: parsed.RAILWAY_SERVICE_NAME ?? "bullmq-api-worker",
  }
}
