import { getDatabaseEnvironment } from "@builders/db"
import {
  INVOICE_GENERATION_QUEUE,
  type GenerateWorkOrderInvoiceJobV1,
} from "@builders/domain"
import { QueueEvents, Worker } from "bullmq"
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
    async (job) => processInvoice(job.data, env),
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
    console.log(JSON.stringify({
      status: "invoice-job-active",
      queue: INVOICE_GENERATION_QUEUE,
      jobId: job.id,
      workOrderId: job.data.workOrderId,
      idempotencyKey: job.data.idempotencyKey,
    }))
  })

  invoiceWorker.on("completed", (job, result) => {
    console.log(JSON.stringify({
      status: "invoice-job-completed",
      queue: INVOICE_GENERATION_QUEUE,
      jobId: job.id,
      workOrderId: job.data.workOrderId,
      idempotencyKey: job.data.idempotencyKey,
      result,
    }))
  })

  invoiceWorker.on("failed", (job, error) => {
    console.error(JSON.stringify({
      status: "invoice-job-failed",
      queue: INVOICE_GENERATION_QUEUE,
      jobId: job?.id ?? null,
      workOrderId: job?.data.workOrderId ?? null,
      idempotencyKey: job?.data.idempotencyKey ?? null,
      error: error.message,
    }))
  })

  await invoiceWorker.waitUntilReady()
  await invoiceEvents.waitUntilReady()

  console.log(
    JSON.stringify({
      status: "worker-ready",
      queues: [INVOICE_GENERATION_QUEUE],
    }),
  )

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
