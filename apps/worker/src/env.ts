import { z } from "zod"
import type { StorageEnvironment } from "@builders/lib"

const workerEnvironmentSchema = z.object({
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  AWS_ACCESS_KEY_ID: z.string().min(1, "AWS_ACCESS_KEY_ID is required"),
  AWS_DEFAULT_REGION: z.string().min(1, "AWS_DEFAULT_REGION is required"),
  AWS_ENDPOINT_URL: z.string().url("AWS_ENDPOINT_URL must be a valid URL"),
  AWS_S3_BUCKET_NAME: z.string().min(1, "AWS_S3_BUCKET_NAME is required"),
  AWS_SECRET_ACCESS_KEY: z.string().min(1, "AWS_SECRET_ACCESS_KEY is required"),
  INVOICE_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  INVOICE_WORKER_LOCK_DURATION_MS: z.coerce.number().int().positive().default(300_000),
})

export type WorkerEnvironment = {
  redisUrl: string
  invoiceWorkerConcurrency: number
  invoiceWorkerLockDurationMs: number
  storage: StorageEnvironment
}

export function getWorkerEnvironment(source: NodeJS.ProcessEnv = process.env): WorkerEnvironment {
  const parsed = workerEnvironmentSchema.parse({
    REDIS_URL: source.REDIS_URL,
    AWS_ACCESS_KEY_ID: source.AWS_ACCESS_KEY_ID,
    AWS_DEFAULT_REGION: source.AWS_DEFAULT_REGION,
    AWS_ENDPOINT_URL: source.AWS_ENDPOINT_URL,
    AWS_S3_BUCKET_NAME: source.AWS_S3_BUCKET_NAME,
    AWS_SECRET_ACCESS_KEY: source.AWS_SECRET_ACCESS_KEY,
    INVOICE_WORKER_CONCURRENCY: source.INVOICE_WORKER_CONCURRENCY,
    INVOICE_WORKER_LOCK_DURATION_MS: source.INVOICE_WORKER_LOCK_DURATION_MS,
  })

  return {
    redisUrl: parsed.REDIS_URL,
    invoiceWorkerConcurrency: parsed.INVOICE_WORKER_CONCURRENCY,
    invoiceWorkerLockDurationMs: parsed.INVOICE_WORKER_LOCK_DURATION_MS,
    storage: {
      accessKeyId: parsed.AWS_ACCESS_KEY_ID,
      defaultRegion: parsed.AWS_DEFAULT_REGION,
      endpointUrl: parsed.AWS_ENDPOINT_URL,
      bucketName: parsed.AWS_S3_BUCKET_NAME,
      secretAccessKey: parsed.AWS_SECRET_ACCESS_KEY,
    },
  }
}
