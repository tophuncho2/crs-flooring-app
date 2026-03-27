import { getDatabaseEnvironment } from "@builders/db"
import {
  INVOICE_GENERATION_QUEUE,
  type GenerateWorkOrderInvoiceJobV1,
  WORK_ORDER_AUTO_ALLOCATION_QUEUE,
  type AutoAllocateWorkOrderJobV1,
} from "@builders/domain"
import { logStructuredEvent, parseRedisConnectionUrl } from "@builders/lib"
import { Queue } from "bullmq"
import { createInvoiceOutboxDispatcher } from "./dispatch/invoice-outbox-dispatcher.js"
import { createWorkOrderAllocationOutboxDispatcher } from "./dispatch/work-order-allocation-outbox-dispatcher.js"
import { getRelayEnvironment } from "./env.js"

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function main() {
  getDatabaseEnvironment()
  const env = getRelayEnvironment()
  const connection = parseRedisConnectionUrl(env.queueRedisUrl)
  const invoiceQueue = new Queue<GenerateWorkOrderInvoiceJobV1>(INVOICE_GENERATION_QUEUE, {
    connection,
  })
  const autoAllocationQueue = new Queue<AutoAllocateWorkOrderJobV1>(WORK_ORDER_AUTO_ALLOCATION_QUEUE, {
    connection,
  })
  const invoiceDispatcher = createInvoiceOutboxDispatcher()
  const allocationDispatcher = createWorkOrderAllocationOutboxDispatcher()

  await Promise.all([invoiceQueue.waitUntilReady(), autoAllocationQueue.waitUntilReady()])

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Relay ready",
    action: "relay.ready",
    status: "ready",
    details: {
      queue: INVOICE_GENERATION_QUEUE,
      allocationQueue: WORK_ORDER_AUTO_ALLOCATION_QUEUE,
      batchSize: env.batchSize,
      pollIntervalMs: env.pollIntervalMs,
    },
  })

  let shuttingDown = false

  const shutdown = async () => {
    shuttingDown = true
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)

  while (!shuttingDown) {
    try {
      await Promise.all([
        invoiceDispatcher.dispatchBatch(env, invoiceQueue),
        allocationDispatcher.dispatchBatch(env, autoAllocationQueue),
      ])
    } catch (error) {
      logStructuredEvent({
        level: "error",
        service: env.serviceName,
        environment: env.environmentName,
        message: "Relay dispatch loop failed",
        action: "relay.loop",
        error,
      })
    }

    await sleep(env.pollIntervalMs)
  }

  process.off("SIGINT", shutdown)
  process.off("SIGTERM", shutdown)
  await Promise.all([invoiceQueue.close(), autoAllocationQueue.close()])
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
