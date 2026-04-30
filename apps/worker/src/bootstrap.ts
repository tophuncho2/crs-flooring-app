import { getDatabaseEnvironment } from "@builders/db"
import {
  FINALIZE_WORK_ORDER_CUT_LOG_BATCH_QUEUE,
  GENERATE_WORK_ORDER_FILE_QUEUE,
  IMPORT_MATERIALIZE_QUEUE,
  SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE,
  type FinalizeWorkOrderCutLogBatchPayload,
  type GenerateWorkOrderFilePayload,
  type ImportMaterializeBatchPayload,
  type SaveWorkOrderItemPendingCutLogDiffPayload,
} from "@builders/domain"
import { logStructuredEvent } from "@builders/lib"
import { QueueEvents, Worker } from "bullmq"
import { getWorkerEnvironment, getWorkerStorageEnvironment } from "./env.js"
import { createFinalizeWorkOrderCutLogBatchHandler } from "./processors/finalize-work-order-cut-log-batch.js"
import { createMaterializeImportBatchHandler } from "./processors/materialize-import-batch.js"
import { createSaveWorkOrderItemPendingCutLogDiffHandler } from "./processors/save-work-order-item-pending-cut-log-diff.js"
import { createWorkOrderFileGenerationHandler } from "./processors/work-order-file-generation.js"
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
  // Work order item pending cut-log diff (sweep 7)
  // ---------------------------------------------------------------------------
  const woPendingCutLogHandler = createSaveWorkOrderItemPendingCutLogDiffHandler()
  const woPendingCutLogWorker = new Worker<SaveWorkOrderItemPendingCutLogDiffPayload>(
    SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE,
    async (job) => woPendingCutLogHandler(job),
    {
      connection,
      concurrency: env.workOrderPendingCutLogWorkerConcurrency,
      lockDuration: env.workOrderPendingCutLogWorkerLockDurationMs,
      autorun: false,
    },
  )
  const woPendingCutLogEvents = new QueueEvents(
    SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE,
    { connection },
  )

  woPendingCutLogWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order pending cut-log diff job active",
      action: "worker.work_orders.pending_cut_log_diff.active",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
      details: {
        workOrderId: job.data.workOrderId,
        workOrderItemId: job.data.workOrderItemId,
        addedCount: job.data.diff.added.length,
        modifiedCount: job.data.diff.modified.length,
        deletedCount: job.data.diff.deleted.length,
      },
    })
  })

  woPendingCutLogWorker.on("completed", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order pending cut-log diff job completed",
      action: "worker.work_orders.pending_cut_log_diff.completed",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details: {
        workOrderId: job.data.workOrderId,
        workOrderItemId: job.data.workOrderItemId,
        addedCount: job.data.diff.added.length,
        modifiedCount: job.data.diff.modified.length,
        deletedCount: job.data.diff.deleted.length,
      },
    })
  })

  woPendingCutLogWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order pending cut-log diff job failed",
      action: "worker.work_orders.pending_cut_log_diff.failed",
      idempotencyKey: typeof job?.id === "string" ? job.id : undefined,
      queueJobId: typeof job?.id === "string" ? job.id : undefined,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      details: job
        ? {
            workOrderId: job.data.workOrderId,
            workOrderItemId: job.data.workOrderItemId,
            addedCount: job.data.diff.added.length,
            modifiedCount: job.data.diff.modified.length,
            deletedCount: job.data.diff.deleted.length,
          }
        : undefined,
      error,
    })
  })

  // ---------------------------------------------------------------------------
  // Work order finalize cut-log batch (sweep 7)
  // ---------------------------------------------------------------------------
  const woFinalizeCutLogHandler = createFinalizeWorkOrderCutLogBatchHandler()
  const woFinalizeCutLogWorker = new Worker<FinalizeWorkOrderCutLogBatchPayload>(
    FINALIZE_WORK_ORDER_CUT_LOG_BATCH_QUEUE,
    async (job) => woFinalizeCutLogHandler(job),
    {
      connection,
      concurrency: env.workOrderFinalizeCutLogWorkerConcurrency,
      lockDuration: env.workOrderFinalizeCutLogWorkerLockDurationMs,
      autorun: false,
    },
  )
  const woFinalizeCutLogEvents = new QueueEvents(
    FINALIZE_WORK_ORDER_CUT_LOG_BATCH_QUEUE,
    { connection },
  )

  woFinalizeCutLogWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order finalize cut-log batch job active",
      action: "worker.work_orders.finalize_cut_log.active",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
      details: {
        workOrderId: job.data.workOrderId,
        cutLogCount: job.data.cutLogIds.length,
      },
    })
  })

  woFinalizeCutLogWorker.on("completed", (job, result) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order finalize cut-log batch job completed",
      action: "worker.work_orders.finalize_cut_log.completed",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details: {
        workOrderId: job.data.workOrderId,
        cutLogCount: job.data.cutLogIds.length,
        touchedWorkOrderItemIdsCount:
          result &&
          typeof result === "object" &&
          "touchedWorkOrderItemIds" in result &&
          Array.isArray((result as { touchedWorkOrderItemIds: unknown[] }).touchedWorkOrderItemIds)
            ? (result as { touchedWorkOrderItemIds: unknown[] }).touchedWorkOrderItemIds.length
            : undefined,
      },
    })
  })

  woFinalizeCutLogWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order finalize cut-log batch job failed",
      action: "worker.work_orders.finalize_cut_log.failed",
      idempotencyKey: typeof job?.id === "string" ? job.id : undefined,
      queueJobId: typeof job?.id === "string" ? job.id : undefined,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      details: job
        ? {
            workOrderId: job.data.workOrderId,
            cutLogCount: job.data.cutLogIds.length,
          }
        : undefined,
      error,
    })
  })

  // ---------------------------------------------------------------------------
  // Work order file generation (sweep 7)
  // ---------------------------------------------------------------------------
  // Storage env asserted here so a missing AWS_* var fails fast at boot
  // with a precise error message, rather than silently per-job.
  const workOrderFileStorageEnv = getWorkerStorageEnvironment(env)
  const woFileGenHandler = createWorkOrderFileGenerationHandler({
    storageEnv: workOrderFileStorageEnv,
  })
  const woFileGenWorker = new Worker<GenerateWorkOrderFilePayload>(
    GENERATE_WORK_ORDER_FILE_QUEUE,
    async (job) => woFileGenHandler(job),
    {
      connection,
      concurrency: env.workOrderFileGenerationWorkerConcurrency,
      lockDuration: env.workOrderFileGenerationWorkerLockDurationMs,
      autorun: false,
    },
  )
  const woFileGenEvents = new QueueEvents(GENERATE_WORK_ORDER_FILE_QUEUE, { connection })

  woFileGenWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order file generation job active",
      action: "worker.work_orders.file_generation.active",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
      details: {
        workOrderId: job.data.workOrderId,
        fileId: job.data.fileId,
      },
    })
  })

  woFileGenWorker.on("completed", (job, result) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order file generation job completed",
      action: "worker.work_orders.file_generation.completed",
      idempotencyKey: typeof job.id === "string" ? job.id : undefined,
      queueJobId: typeof job.id === "string" ? job.id : undefined,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details: {
        workOrderId: job.data.workOrderId,
        fileId: job.data.fileId,
        fileKey:
          result && typeof result === "object" && "fileKey" in result &&
          typeof (result as { fileKey: unknown }).fileKey === "string"
            ? (result as { fileKey: string }).fileKey
            : undefined,
      },
    })
  })

  woFileGenWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work-order file generation job failed",
      action: "worker.work_orders.file_generation.failed",
      idempotencyKey: typeof job?.id === "string" ? job.id : undefined,
      queueJobId: typeof job?.id === "string" ? job.id : undefined,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      details: job
        ? {
            workOrderId: job.data.workOrderId,
            fileId: job.data.fileId,
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
    woPendingCutLogWorker.waitUntilReady(),
    woPendingCutLogEvents.waitUntilReady(),
    woFinalizeCutLogWorker.waitUntilReady(),
    woFinalizeCutLogEvents.waitUntilReady(),
    woFileGenWorker.waitUntilReady(),
    woFileGenEvents.waitUntilReady(),
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
  void woPendingCutLogWorker.run()
  void woFinalizeCutLogWorker.run()
  void woFileGenWorker.run()

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Worker ready",
    action: "worker.ready",
    status: "ready",
    details: {
      queues: [
        IMPORT_MATERIALIZE_QUEUE,
        SAVE_WORK_ORDER_ITEM_PENDING_CUT_LOG_DIFF_QUEUE,
        FINALIZE_WORK_ORDER_CUT_LOG_BATCH_QUEUE,
        GENERATE_WORK_ORDER_FILE_QUEUE,
      ],
      concurrency: {
        materialize: env.materializeWorkerConcurrency,
        workOrderPendingCutLog: env.workOrderPendingCutLogWorkerConcurrency,
        workOrderFinalizeCutLog: env.workOrderFinalizeCutLogWorkerConcurrency,
        workOrderFileGeneration: env.workOrderFileGenerationWorkerConcurrency,
      },
      lockDurationMs: {
        materialize: env.materializeWorkerLockDurationMs,
        workOrderPendingCutLog: env.workOrderPendingCutLogWorkerLockDurationMs,
        workOrderFinalizeCutLog: env.workOrderFinalizeCutLogWorkerLockDurationMs,
        workOrderFileGeneration: env.workOrderFileGenerationWorkerLockDurationMs,
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
        woPendingCutLogEvents.close(),
        woPendingCutLogWorker.close(),
        woFinalizeCutLogEvents.close(),
        woFinalizeCutLogWorker.close(),
        woFileGenEvents.close(),
        woFileGenWorker.close(),
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
