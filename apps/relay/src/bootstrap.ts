import { getDatabaseEnvironment } from "@builders/db"
import { logStructuredEvent, parseRedisConnectionUrl } from "@builders/lib"
import { startBullBoardServer } from "./bull-board.js"
import { buildDispatchers } from "./dispatch/dispatchers.js"
import { dispatchBatchForTopic } from "./dispatch/topic-dispatcher.js"
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
  const dispatchers = buildDispatchers(connection)

  await Promise.all(dispatchers.map((d) => d.queue.waitUntilReady()))

  const bullBoardServer = await startBullBoardServer({ env, dispatchers })

  logStructuredEvent({
    service: env.serviceName,
    environment: env.environmentName,
    message: "Relay ready",
    action: "relay.ready",
    status: "ready",
    details: {
      topics: dispatchers.map((d) => d.topic),
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
    const results = await Promise.allSettled(
      dispatchers.map((d) => dispatchBatchForTopic(env, d)),
    )

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        logStructuredEvent({
          level: "error",
          service: env.serviceName,
          environment: env.environmentName,
          message: "Relay dispatch loop failed",
          action: "relay.loop",
          details: { topic: dispatchers[index]?.topic },
          error: result.reason,
        })
      }
    }

    await sleep(env.pollIntervalMs)
  }

  process.off("SIGINT", shutdown)
  process.off("SIGTERM", shutdown)

  await Promise.all([
    bullBoardServer?.close(),
    ...dispatchers.map((d) => d.close()),
  ])
}

main().catch((error) => {
  logStructuredEvent({
    level: "error",
    service: "relay",
    environment: process.env.RAILWAY_ENVIRONMENT_NAME ?? process.env.NODE_ENV ?? "unknown",
    message: "Relay fatal startup error",
    action: "relay.fatal",
    error,
  })
  process.exitCode = 1
})
