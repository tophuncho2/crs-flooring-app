import { getDatabaseEnvironment } from "@builders/db"
import {
  FINALIZE_CUT_LOG_QUEUE,
  IMPORT_MATERIALIZE_QUEUE,
  PENDING_SAVE_CUT_LOG_QUEUE,
  VOID_CUT_LOG_QUEUE,
  type FinalizeCutLogBatchPayload,
  type ImportMaterializeBatchPayload,
  type PendingSaveCutLogBatchPayload,
  type VoidCutLogPayload,
} from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import { QueueEvents, Worker } from "bullmq"
import { getWorkerEnvironment } from "./env.js"
import { createFinalizeCutLogBatchHandler } from "./processors/finalize-cut-log-batch.js"
import { createMaterializeImportBatchHandler } from "./processors/materialize-import-batch.js"
import { createPendingSaveCutLogBatchHandler } from "./processors/pending-save-cut-log-batch.js"
import { createVoidCutLogHandler } from "./processors/void-cut-log.js"
import { createQueueConnection } from "./queues/connection.js"

async function main() {
  getDatabaseEnvironment()
  const env = getWorkerEnvironment()
  const connection = createQueueConnection(env)

  // ---------------------------------------------------------------------------
  // Materialize import batch (existing)
  // ---------------------------------------------------------------------------
  const materializeHandler = createMaterializeImportBatchHandler()
  const materializeWorker = new Worker<ImportMaterializeBatchPayload>(
    IMPORT_MATERIALIZE_QUEUE,
    async (job) => materializeHandler(job),
    {
      connection,
      concurrency: env.materializeWorkerConcurrency,
      lockDuration: env.materializeWorkerLockDurationMs,
      autorun: false,
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

  // ---------------------------------------------------------------------------
  // Cut-log pending-save (sweep 5)
  // ---------------------------------------------------------------------------
  const pendingSaveCutLogHandler = createPendingSaveCutLogBatchHandler()
  const pendingSaveCutLogWorker = new Worker<PendingSaveCutLogBatchPayload>(
    PENDING_SAVE_CUT_LOG_QUEUE,
    async (job) => pendingSaveCutLogHandler(job),
    {
      connection,
      concurrency: env.pendingSaveCutLogWorkerConcurrency,
      lockDuration: env.pendingSaveCutLogWorkerLockDurationMs,
      autorun: false,
    },
  )
  const pendingSaveCutLogEvents = new QueueEvents(PENDING_SAVE_CUT_LOG_QUEUE, { connection })

  pendingSaveCutLogWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Pending-save cut log batch job active",
      action: "worker.cut_logs.pending_save.active",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
      details: {
        inventoryId: job.data.inventoryId,
        addedCount: job.data.diff.added.length,
        modifiedCount: job.data.diff.modified.length,
        deletedCount: job.data.diff.deleted.length,
      },
    })
  })

  pendingSaveCutLogWorker.on("completed", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Pending-save cut log batch job completed",
      action: "worker.cut_logs.pending_save.completed",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details: {
        inventoryId: job.data.inventoryId,
        addedCount: job.data.diff.added.length,
        modifiedCount: job.data.diff.modified.length,
        deletedCount: job.data.diff.deleted.length,
      },
    })
  })

  pendingSaveCutLogWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Pending-save cut log batch job failed",
      action: "worker.cut_logs.pending_save.failed",
      idempotencyKey: typeof job?.id === "string" ? job.id : undefined,
      queueJobId: typeof job?.id === "string" ? job.id : undefined,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      details: job
        ? {
            inventoryId: job.data.inventoryId,
            addedCount: job.data.diff.added.length,
            modifiedCount: job.data.diff.modified.length,
            deletedCount: job.data.diff.deleted.length,
          }
        : undefined,
      error,
    })
  })

  // ---------------------------------------------------------------------------
  // Cut-log finalize (sweep 5)
  // ---------------------------------------------------------------------------
  const finalizeCutLogHandler = createFinalizeCutLogBatchHandler()
  const finalizeCutLogWorker = new Worker<FinalizeCutLogBatchPayload>(
    FINALIZE_CUT_LOG_QUEUE,
    async (job) => finalizeCutLogHandler(job),
    {
      connection,
      concurrency: env.finalizeCutLogWorkerConcurrency,
      lockDuration: env.finalizeCutLogWorkerLockDurationMs,
      autorun: false,
    },
  )
  const finalizeCutLogEvents = new QueueEvents(FINALIZE_CUT_LOG_QUEUE, { connection })

  finalizeCutLogWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Finalize cut log batch job active",
      action: "worker.cut_logs.finalize.active",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
      details: {
        inventoryId: job.data.inventoryId,
        cutLogCount: job.data.cutLogIds.length,
      },
    })
  })

  finalizeCutLogWorker.on("completed", (job, result) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Finalize cut log batch job completed",
      action: "worker.cut_logs.finalize.completed",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details: {
        inventoryId: job.data.inventoryId,
        cutLogCount: job.data.cutLogIds.length,
        finalizedCount:
          result && typeof result === "object" && "finalizedRowIds" in result &&
          Array.isArray((result as { finalizedRowIds: unknown[] }).finalizedRowIds)
            ? (result as { finalizedRowIds: unknown[] }).finalizedRowIds.length
            : undefined,
      },
    })
  })

  finalizeCutLogWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Finalize cut log batch job failed",
      action: "worker.cut_logs.finalize.failed",
      idempotencyKey: typeof job?.id === "string" ? job.id : undefined,
      queueJobId: typeof job?.id === "string" ? job.id : undefined,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      details: job
        ? {
            inventoryId: job.data.inventoryId,
            cutLogCount: job.data.cutLogIds.length,
          }
        : undefined,
      error,
    })
  })

  // ---------------------------------------------------------------------------
  // Cut-log void (sweep 5)
  // ---------------------------------------------------------------------------
  const voidCutLogHandler = createVoidCutLogHandler()
  const voidCutLogWorker = new Worker<VoidCutLogPayload>(
    VOID_CUT_LOG_QUEUE,
    async (job) => voidCutLogHandler(job),
    {
      connection,
      concurrency: env.voidCutLogWorkerConcurrency,
      lockDuration: env.voidCutLogWorkerLockDurationMs,
      autorun: false,
    },
  )
  const voidCutLogEvents = new QueueEvents(VOID_CUT_LOG_QUEUE, { connection })

  voidCutLogWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Void cut log job active",
      action: "worker.cut_logs.void.active",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
      details: {
        inventoryId: job.data.inventoryId,
        cutLogId: job.data.cutLogId,
      },
    })
  })

  voidCutLogWorker.on("completed", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Void cut log job completed",
      action: "worker.cut_logs.void.completed",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details: {
        inventoryId: job.data.inventoryId,
        cutLogId: job.data.cutLogId,
      },
    })
  })

  voidCutLogWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Void cut log job failed",
      action: "worker.cut_logs.void.failed",
      idempotencyKey: typeof job?.id === "string" ? job.id : undefined,
      queueJobId: typeof job?.id === "string" ? job.id : undefined,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      details: job
        ? {
            inventoryId: job.data.inventoryId,
            cutLogId: job.data.cutLogId,
          }
        : undefined,
      error,
    })
  })

  // ---------------------------------------------------------------------------
  // Wait for everyone, log readiness, set up shutdown
  // ---------------------------------------------------------------------------
  await Promise.all([
    materializeWorker.waitUntilReady(),
    materializeEvents.waitUntilReady(),
    pendingSaveCutLogWorker.waitUntilReady(),
    pendingSaveCutLogEvents.waitUntilReady(),
    finalizeCutLogWorker.waitUntilReady(),
    finalizeCutLogEvents.waitUntilReady(),
    voidCutLogWorker.waitUntilReady(),
    voidCutLogEvents.waitUntilReady(),
  ])

  // Each Worker was constructed with `autorun: false` so it doesn't pull
  // jobs until we explicitly call `.run()`. This eliminates the cold-start
  // race where a job would arrive between the `new Worker(...)` call and
  // the subsequent `.on(...)` listener attachment, causing the first
  // job's `active`/`completed` lifecycle log lines to be silently
  // dropped. By the time `run()` is called here, listeners are attached
  // AND the connection is ready, so every job — including the first one
  // — emits its full structured-log audit trail. The returned promises
  // resolve when each worker is closed (during shutdown); we deliberately
  // don't await them at the call site.
  void materializeWorker.run()
  void pendingSaveCutLogWorker.run()
  void finalizeCutLogWorker.run()
  void voidCutLogWorker.run()

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Worker ready",
    action: "worker.ready",
    status: "ready",
    details: {
      queues: [
        IMPORT_MATERIALIZE_QUEUE,
        PENDING_SAVE_CUT_LOG_QUEUE,
        FINALIZE_CUT_LOG_QUEUE,
        VOID_CUT_LOG_QUEUE,
      ],
      concurrency: {
        materialize: env.materializeWorkerConcurrency,
        pendingSaveCutLog: env.pendingSaveCutLogWorkerConcurrency,
        finalizeCutLog: env.finalizeCutLogWorkerConcurrency,
        voidCutLog: env.voidCutLogWorkerConcurrency,
      },
      lockDurationMs: {
        materialize: env.materializeWorkerLockDurationMs,
        pendingSaveCutLog: env.pendingSaveCutLogWorkerLockDurationMs,
        finalizeCutLog: env.finalizeCutLogWorkerLockDurationMs,
        voidCutLog: env.voidCutLogWorkerLockDurationMs,
      },
    },
  })

  await new Promise<void>((resolve) => {
    const shutdown = async () => {
      process.off("SIGINT", shutdown)
      process.off("SIGTERM", shutdown)
      await Promise.all([
        materializeEvents.close(),
        materializeWorker.close(),
        pendingSaveCutLogEvents.close(),
        pendingSaveCutLogWorker.close(),
        finalizeCutLogEvents.close(),
        finalizeCutLogWorker.close(),
        voidCutLogEvents.close(),
        voidCutLogWorker.close(),
      ])
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
