import { createProcessorRegistry } from "./processors/index.js"
import { getWorkerEnvironment } from "./env.js"
import { createQueueConnection } from "./queues/connection.js"

async function main() {
  const env = getWorkerEnvironment()
  const registry = createProcessorRegistry()
  const connection = await createQueueConnection(env)

  if (!connection) {
    console.log(
      JSON.stringify({
        status: "worker-runtime-not-enabled",
        registeredProcessors: Object.keys(registry),
      }),
    )
    return
  }

  console.log(
    JSON.stringify({
      status: "worker-connected",
      registeredProcessors: Object.keys(registry),
    }),
  )

  await connection.quit()
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
