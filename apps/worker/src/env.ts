import { z } from "zod"
import type { StorageEnvironment } from "@builders/lib"

const workerEnvironmentSchema = z.object({
  QUEUE_REDIS_URL: z.string().url("QUEUE_REDIS_URL must be a valid URL").optional(),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL").optional(),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_DEFAULT_REGION: z.string().min(1, "AWS_DEFAULT_REGION is required"),
  AWS_ENDPOINT_URL: z.string().url("AWS_ENDPOINT_URL must be a valid URL"),
  AWS_S3_BUCKET_NAME: z.string().min(1, "AWS_S3_BUCKET_NAME is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  INVOICE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  INVOICE_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(300_000),
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
  invoiceWorkerConcurrency: number
  invoiceWorkerLockDurationMs: number
  environmentName: string
  serviceName: string
  storage: StorageEnvironment
}

export function getWorkerEnvironment(source: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  const parsed = workerEnvironmentSchema.parse({
    QUEUE_REDIS_URL: source.QUEUE_REDIS_URL,
    REDIS_URL: source.REDIS_URL,
    AWS_ACCESS_KEY_ID: source.AWS_ACCESS_KEY_ID,
    AWS_DEFAULT_REGION: source.AWS_DEFAULT_REGION,
    AWS_ENDPOINT_URL: source.AWS_ENDPOINT_URL,
    AWS_S3_BUCKET_NAME: source.AWS_S3_BUCKET_NAME,
    AWS_SECRET_ACCESS_KEY: source.AWS_SECRET_ACCESS_KEY,
    INVOICE_WORKER_CONCURRENCY: source.INVOICE_WORKER_CONCURRENCY,
    INVOICE_WORKER_LOCK_DURATION_MS: source.INVOICE_WORKER_LOCK_DURATION_MS,
    RAILWAY_ENVIRONMENT_NAME: source.RAILWAY_ENVIRONMENT_NAME,
    RAILWAY_SERVICE_NAME: source.RAILWAY_SERVICE_NAME,
  })

  return {
    queueRedisUrl: parsed.QUEUE_REDIS_URL ?? parsed.REDIS_URL!,
    invoiceWorkerConcurrency: parsed.INVOICE_WORKER_CONCURRENCY,
    invoiceWorkerLockDurationMs: parsed.INVOICE_WORKER_LOCK_DURATION_MS,
    environmentName: parsed.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "development",
    serviceName: parsed.RAILWAY_SERVICE_NAME ?? "bullmq-api-worker",
    storage: {
      accessKeyId: parsed.AWS_ACCESS_KEY_ID,
      defaultRegion: parsed.AWS_DEFAULT_REGION,
      endpointUrl: parsed.AWS_ENDPOINT_URL,
      bucketName: parsed.AWS_S3_BUCKET_NAME,
      secretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
    },
  }
}
