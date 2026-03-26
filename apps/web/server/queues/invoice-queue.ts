import { Queue } from "bullmq"
import {
  GENERATE_WORK_ORDER_INVOICE_JOB,
  INVOICE_GENERATION_QUEUE,
  INVOICE_GENERATION_RETRY_POLICY,
  type GenerateWorkOrderInvoiceJobV1,
} from "@builders/domain"
import { parseRedisConnectionUrl } from "@builders/lib"
import { getRateLimitEnvironment } from "@/server/platform/env"

declare global {
  var flooringInvoiceQueueSingleton: Queue<GenerateWorkOrderInvoiceJobV1> | undefined
}

function getInvoiceQueue() {
  if (globalThis.flooringInvoiceQueueSingleton) {
    return globalThis.flooringInvoiceQueueSingleton
  }

  const redisUrl = getRateLimitEnvironment().redisUrl
  if (!redisUrl) {
    throw new Error("REDIS_URL is required for invoice generation")
  }

  globalThis.flooringInvoiceQueueSingleton = new Queue<GenerateWorkOrderInvoiceJobV1>(INVOICE_GENERATION_QUEUE, {
    connection: parseRedisConnectionUrl(redisUrl),
  })

  return globalThis.flooringInvoiceQueueSingleton
}

export async function enqueueWorkOrderInvoiceJob(payload: GenerateWorkOrderInvoiceJobV1) {
  return getInvoiceQueue().add(GENERATE_WORK_ORDER_INVOICE_JOB, payload, {
    ...INVOICE_GENERATION_RETRY_POLICY,
    jobId: payload.idempotencyKey,
  })
}
