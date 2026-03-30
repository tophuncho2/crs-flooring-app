import { getDatabaseEnvironment } from "@builders/db"
import {
  WORK_ORDER_AUTO_ALLOCATION_QUEUE,
  parseAutoAllocateWorkOrderJob,
  type AutoAllocateWorkOrderJobV1,
} from "@builders/domain"
import { QueueEvents, Worker } from "bullmq"
import { logStructuredEvent } from "@builders/lib"
import { getWorkerEnvironment } from "./env.js"
import { createWorkOrderAutoAllocationProcessor } from "./processors/process-work-order-auto-allocation.js"
import { createQueueConnection } from "./queues/connection.js"

async function main() {
  getDatabaseEnvironment()
  const env = getWorkerEnvironment()
  const connection = await createQueueConnection(env)
  const processAutoAllocation = createWorkOrderAutoAllocationProcessor()
  const autoAllocationWorker = new Worker<AutoAllocateWorkOrderJobV1>(
    WORK_ORDER_AUTO_ALLOCATION_QUEUE,
    async (job) =>
      processAutoAllocation(parseAutoAllocateWorkOrderJob(job.data), env, {
        attemptNumber: job.attemptsMade + 1,
        maxAttempts: typeof job.opts.attempts === "number" ? job.opts.attempts : 1,
      }),
    {
      connection,
      concurrency: env.autoAllocationWorkerConcurrency,
      lockDuration: env.autoAllocationWorkerLockDurationMs,
    },
  )
  const autoAllocationEvents = new QueueEvents(WORK_ORDER_AUTO_ALLOCATION_QUEUE, {
    connection,
  })

  autoAllocationWorker.on("active", (job) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work order auto-allocation job active",
      action: "worker.workOrders.autoAllocation.active",
      requestId: job.data.requestId,
      workOrderId: job.data.workOrderId,
      generationId: job.data.allocationRunId,
      idempotencyKey: job.data.idempotencyKey,
      queueJobId: job.id ?? job.data.idempotencyKey,
      attempt: job.attemptsStarted,
      status: "PROCESSING",
    })
  })

  autoAllocationWorker.on("completed", (job, result) => {
    logStructuredEvent({
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work order auto-allocation job completed",
      action: "worker.workOrders.autoAllocation.completed",
      requestId: job.data.requestId,
      workOrderId: job.data.workOrderId,
      generationId: job.data.allocationRunId,
      idempotencyKey: job.data.idempotencyKey,
      queueJobId: job.id ?? job.data.idempotencyKey,
      attempt: job.attemptsStarted,
      status: "COMPLETED",
      details:
        result && typeof result === "object"
          ? result
          : undefined,
    })
  })

  autoAllocationWorker.on("failed", (job, error) => {
    logStructuredEvent({
      level: "error",
      service: env.serviceName,
      environment: env.environmentName,
      message: "Work order auto-allocation job failed",
      action: "worker.workOrders.autoAllocation.failed",
      requestId: job?.data.requestId,
      workOrderId: job?.data.workOrderId,
      generationId: job?.data.allocationRunId,
      idempotencyKey: job?.data.idempotencyKey,
      queueJobId: job?.id ?? job?.data.idempotencyKey,
      attempt: job?.attemptsStarted,
      status: "FAILED",
      error,
    })
  })

  await Promise.all([
    autoAllocationWorker.waitUntilReady(),
    autoAllocationEvents.waitUntilReady(),
  ])

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Worker ready",
    action: "worker.ready",
    status: "ready",
    details: {
      queues: [WORK_ORDER_AUTO_ALLOCATION_QUEUE],
    },
  })

  await new Promise<void>((resolve) => {
    const shutdown = async () => {
      process.off("SIGINT", shutdown)
      process.off("SIGTERM", shutdown)
      await Promise.all([
        autoAllocationEvents.close(),
        autoAllocationWorker.close(),
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
