import type { StorageEnvironment } from "@builders/lib"
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
  WORK_ORDER_PENDING_CUT_LOG_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  WORK_ORDER_PENDING_CUT_LOG_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(60_000),
  WORK_ORDER_FINALIZE_CUT_LOG_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  WORK_ORDER_FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(60_000),
  WORK_ORDER_FILE_GENERATION_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(1),
  // PDF render + bucket upload can take ~30s; lock duration is generous so
  // a slow render does not let the lock expire mid-flight.
  WORK_ORDER_FILE_GENERATION_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(180_000),
  // Bucket credentials for the file-generation worker. Optional at the
  // schema level — `getWorkerStorageEnvironment` below throws with a
  // precise list of missing vars when the file-gen worker actually
  // needs them at startup.
  AWS_ACCESS_KEY_ID: z.string().min(1).optional(),
  AWS_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  AWS_DEFAULT_REGION: z.string().min(1).optional(),
  AWS_ENDPOINT_URL: z.string().url("AWS_ENDPOINT_URL must be a valid URL").optional(),
  AWS_S3_BUCKET_NAME: z.string().min(1).optional(),
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
  workOrderPendingCutLogWorkerConcurrency: number
  workOrderPendingCutLogWorkerLockDurationMs: number
  workOrderFinalizeCutLogWorkerConcurrency: number
  workOrderFinalizeCutLogWorkerLockDurationMs: number
  workOrderFileGenerationWorkerConcurrency: number
  workOrderFileGenerationWorkerLockDurationMs: number
  awsAccessKeyId: string | undefined
  awsSecretAccessKey: string | undefined
  awsDefaultRegion: string | undefined
  awsEndpointUrl: string | undefined
  awsBucketName: string | undefined
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
    WORK_ORDER_PENDING_CUT_LOG_WORKER_CONCURRENCY:
      source.WORK_ORDER_PENDING_CUT_LOG_WORKER_CONCURRENCY,
    WORK_ORDER_PENDING_CUT_LOG_WORKER_LOCK_DURATION_MS:
      source.WORK_ORDER_PENDING_CUT_LOG_WORKER_LOCK_DURATION_MS,
    WORK_ORDER_FINALIZE_CUT_LOG_WORKER_CONCURRENCY:
      source.WORK_ORDER_FINALIZE_CUT_LOG_WORKER_CONCURRENCY,
    WORK_ORDER_FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS:
      source.WORK_ORDER_FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS,
    WORK_ORDER_FILE_GENERATION_WORKER_CONCURRENCY:
      source.WORK_ORDER_FILE_GENERATION_WORKER_CONCURRENCY,
    WORK_ORDER_FILE_GENERATION_WORKER_LOCK_DURATION_MS:
      source.WORK_ORDER_FILE_GENERATION_WORKER_LOCK_DURATION_MS,
    AWS_ACCESS_KEY_ID: source.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: source.AWS_SECRET_ACCESS_KEY,
    AWS_DEFAULT_REGION: source.AWS_DEFAULT_REGION,
    AWS_ENDPOINT_URL: source.AWS_ENDPOINT_URL,
    AWS_S3_BUCKET_NAME: source.AWS_S3_BUCKET_NAME,
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
    workOrderPendingCutLogWorkerConcurrency:
      parsed.WORK_ORDER_PENDING_CUT_LOG_WORKER_CONCURRENCY,
    workOrderPendingCutLogWorkerLockDurationMs:
      parsed.WORK_ORDER_PENDING_CUT_LOG_WORKER_LOCK_DURATION_MS,
    workOrderFinalizeCutLogWorkerConcurrency:
      parsed.WORK_ORDER_FINALIZE_CUT_LOG_WORKER_CONCURRENCY,
    workOrderFinalizeCutLogWorkerLockDurationMs:
      parsed.WORK_ORDER_FINALIZE_CUT_LOG_WORKER_LOCK_DURATION_MS,
    workOrderFileGenerationWorkerConcurrency:
      parsed.WORK_ORDER_FILE_GENERATION_WORKER_CONCURRENCY,
    workOrderFileGenerationWorkerLockDurationMs:
      parsed.WORK_ORDER_FILE_GENERATION_WORKER_LOCK_DURATION_MS,
    awsAccessKeyId: parsed.AWS_ACCESS_KEY_ID,
    awsSecretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
    awsDefaultRegion: parsed.AWS_DEFAULT_REGION,
    awsEndpointUrl: parsed.AWS_ENDPOINT_URL,
    awsBucketName: parsed.AWS_S3_BUCKET_NAME,
    environmentName: parsed.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development",
    serviceName: parsed.RAILWAY_SERVICE_NAME ?? "bullmq-api-worker",
  }
}

/**
 * Projects the worker env into a `StorageEnvironment` for the file-gen
 * worker. Throws with a precise list of missing AWS_* vars so the error
 * message points directly at what Railway needs configured.
 */
export function getWorkerStorageEnvironment(env: WorkerEnvironment): StorageEnvironment {
  const missing: string[] = []
  if (!env.awsAccessKeyId) missing.push("AWS_ACCESS_KEY_ID")
  if (!env.awsSecretAccessKey) missing.push("AWS_SECRET_ACCESS_KEY")
  if (!env.awsDefaultRegion) missing.push("AWS_DEFAULT_REGION")
  if (!env.awsEndpointUrl) missing.push("AWS_ENDPOINT_URL")
  if (!env.awsBucketName) missing.push("AWS_S3_BUCKET_NAME")
  if (missing.length > 0) {
    throw new Error(
      `Missing bucket credentials for the work-order file-generation worker: ${missing.join(", ")}`,
    )
  }
  return {
    accessKeyId: env.awsAccessKeyId!,
    secretAccessKey: env.awsSecretAccessKey!,
    defaultRegion: env.awsDefaultRegion!,
    endpointUrl: env.awsEndpointUrl!,
    bucketName: env.awsBucketName!,
  }
}
