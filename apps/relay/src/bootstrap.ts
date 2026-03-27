import { getDatabaseEnvironment } from "@builders/db"
import { INVOICE_GENERATION_QUEUE, type GenerateWorkOrderInvoiceJobV1 } from "@builders/domain"
import { logStructuredEvent, parseRedisConnectionUrl } from "@builders/lib"
import { Queue } from "bullmq"
import { createInvoiceOutboxDispatcher } from "./dispatch/invoice-outbox-dispatcher.js"
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
  const queue = new Queue<GenerateWorkOrderInvoiceJobV1>(INVOICE_GENERATION_QUEUE, {
    connection,
  })
  const dispatcher = createInvoiceOutboxDispatcher()

  await queue.waitUntilReady()

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Relay ready",
    action: "relay.ready",
    status: "ready",
    details: {
      queue: INVOICE_GENERATION_QUEUE,
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
      await dispatcher.dispatchBatch(env, queue)
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
  await queue.close()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
