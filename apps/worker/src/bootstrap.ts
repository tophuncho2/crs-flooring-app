import { getDatabaseEnvironment } from "@builders/db"
import {
  INVOICE_GENERATION_QUEUE,
  parseGenerateWorkOrderInvoiceJob,
  type GenerateWorkOrderInvoiceJobV1,
} from "@builders/domain"
import { QueueEvents, Worker } from "bullmq"
import { logStructuredEvent } from "@builders/lib"
import { getWorkerEnvironment } from "./env.js"
import { createWorkOrderInvoiceProcessor } from "./processors/process-work-order-invoice.js"
import { createQueueConnection } from "./queues/connection.js"

async function main() {
  getDatabaseEnvironment()
  const env = getWorkerEnvironment()
  const connection = await createQueueConnection(env)
  const processInvoice = createWorkOrderInvoiceProcessor()
  const invoiceWorker = new Worker<GenerateWorkOrderInvoiceJobV1>(
    INVOICE_GENERATION_QUEUE,
    async (job) => processInvoice(parseGenerateWorkOrderInvoiceJob(job.data), env),
    {
      connection,
      concurrency: env.invoiceWorkerConcurrency,
      lockDuration: env.invoiceWorkerLockDurationMs,
    },
  )
  const invoiceEvents = new QueueEvents(INVOICE_GENERATION_QUEUE, {
    connection,
  })

  invoiceWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Invoice job active",
      action: "worker.invoice.active",
      requestId: job.data.requestId,
      workOrderId: job.data.workOrderId,
      generationId: job.data.generationId,
      idempotencyKey: job.data.idempotencyKey,
      queueJobId: job.id ?? job.data.idempotencyKey,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
    })
  })

  invoiceWorker.on("completed", (job, result) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Invoice job completed",
      action: "worker.invoice.completed",
      requestId: job.data.requestId,
      workOrderId: job.data.workOrderId,
      generationId: job.data.generationId,
      idempotencyKey: job.data.idempotencyKey,
      queueJobId: job.id ?? job.data.idempotencyKey,
      attempt: job.attemptsStarted,
      fileKey:
        result && typeof result === "object" && "fileKey" in result && typeof result.fileKey === "string"
          ? result.fileKey
          : undefined,
      status: "COMPLETED",
    })
  })

  invoiceWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Invoice job failed",
      action: "worker.invoice.failed",
      requestId: job?.data.requestId,
      workOrderId: job?.data.workOrderId,
      generationId: job?.data.generationId,
      idempotencyKey: job?.data.idempotencyKey,
      queueJobId: job?.id ?? job?.data.idempotencyKey,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      error,
    })
  })

  await invoiceWorker.waitUntilReady()
  await invoiceEvents.waitUntilReady()

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Worker ready",
    action: "worker.ready",
    status: "ready",
    details: {
      queues: [INVOICE_GENERATION_QUEUE],
    },
  })

  await new Promise<void>((resolve) => {
    const shutdown = async () => {
      process.off("SIGINT", shutdown)
      process.off("SIGTERM", shutdown)
      await Promise.all([
        invoiceEvents.close(),
        invoiceWorker.close(),
      ])
      resolve()
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
  })
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
