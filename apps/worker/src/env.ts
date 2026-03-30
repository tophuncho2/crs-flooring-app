import { z } from "zod"

const workerEnvironmentSchema = z.object({
  QUEUE_REDIS_URL: z.string().url("QUEUE_REDIS_URL must be a valid URL").optional(),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
  AUTO_ALLOCATION_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(300_000),
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
  autoAllocationWorkerConcurrency: number
  autoAllocationWorkerLockDurationMs: number
  environmentName: string
  serviceName: string
}

export function getWorkerEnvironment(source: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  const parsed = workerEnvironmentSchema.parse({
    QUEUE_REDIS_URL: source.QUEUE_REDIS_URL,
    REDIS_URL: source.REDIS_URL,
    AUTO_ALLOCATION_WORKER_CONCURRENCY: source.AUTO_ALLOCATION_WORKER_CONCURRENCY,
    AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS: source.AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS,
    RAILWAY_ENVIRONMENT_NAME: source.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_SERVICE_NAME: source.RAILWAY_SERVICE_NAME,
  })

  return {
    queueRedisUrl: parsed.QUEUE_REDIS_URL ?? parsed.REDIS_URL!,
    autoAllocationWorkerConcurrency: parsed.AUTO_ALLOCATION_WORKER_CONCURRENCY,
    autoAllocationWorkerLockDurationMs: parsed.AUTO_ALLOCATION_WORKER_LOCK_DURATION_MS,
    environmentName: parsed.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development",
    serviceName: parsed.RAILWAY_SERVICE_NAME ?? "bullmq-api-worker",
  }
}
