import { getDatabaseEnvironment } from "@builders/db"
import {
  IMPORT_MATERIALIZE_QUEUE,
  type ImportMaterializeBatchPayload,
} from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import { QueueEvents, Worker } from "bullmq"
import { getWorkerEnvironment } from "./env.js"
import { createMaterializeImportBatchHandler } from "./processors/materialize-import-batch.js"
import { createQueueConnection } from "./queues/connection.js"

async function main() {
  getDatabaseEnvironment()
  const env = getWorkerEnvironment()
  const connection = createQueueConnection(env)
  const handler = createMaterializeImportBatchHandler()

  const materializeWorker = new Worker<ImportMaterializeBatchPayload>(
    IMPORT_MATERIALIZE_QUEUE,
    async (job) => handler(job),
    {
      connection,
      concurrency: env.materializeWorkerConcurrency,
      lockDuration: env.materializeWorkerLockDurationMs,
    },
  )

  const materializeEvents = new QueueEvents(IMPORT_MATERIALIZE_QUEUE, { connection })

  materializeWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Materialize import batch job active",
      action: "worker.imports.materialize.active",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
      details: {
        importEntryId: job.data.importEntryId,
        stagedRowCount: job.data.stagedRowIds.length,
      },
    })
  })

  materializeWorker.on("completed", (job, result) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Materialize import batch job completed",
      action: "worker.imports.materialize.completed",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details: {
        importEntryId: job.data.importEntryId,
        stagedRowCount: job.data.stagedRowIds.length,
        materializedCount:
          result && typeof result === "object" && "materializedStagedRowIds" in result &&
          Array.isArray((result as { materializedStagedRowIds: unknown[] }).materializedStagedRowIds)
            ? (result as { materializedStagedRowIds: unknown[] }).materializedStagedRowIds.length
            : undefined,
      },
    })
  })

  materializeWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Materialize import batch job failed",
      action: "worker.imports.materialize.failed",
      idempotencyKey: typeof job?.id === "string" ? job.id : undefined,
      queueJobId: typeof job?.id === "string" ? job.id : undefined,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      details: job
        ? {
            importEntryId: job.data.importEntryId,
            stagedRowCount: job.data.stagedRowIds.length,
          }
        : undefined,
      error,
    })
  })

  await Promise.all([
    materializeWorker.waitUntilReady(),
    materializeEvents.waitUntilReady(),
  ])

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Worker ready",
    action: "worker.ready",
    status: "ready",
    details: {
      queues: [IMPORT_MATERIALIZE_QUEUE],
      concurrency: env.materializeWorkerConcurrency,
      lockDurationMs: env.materializeWorkerLockDurationMs,
    },
  })

  await new Promise<void>((resolve) => {
    const shutdown = async () => {
      process.off("SIGINT", shutdown)
      process.off("SIGTERM", shutdown)
      await Promise.all([materializeEvents.close(), materializeWorker.close()])
      resolve()
    }

    process.on("SIGINT", shutdown)
    process.on("SIGTERM", shutdown)
  })
}

main().catch((error) => {
  logStructuredEvent({
    level: "error",
    service: "worker",
    environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "unknown",
    message: "Worker fatal startup error",
    action: "worker.fatal",
    error,
  })
  process.exitCode = 1
})
