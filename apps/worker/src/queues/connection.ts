import { createClient } from "redis"
import type { WorkerEnvironment } from "../env.js"

export type QueueConnection = ReturnType<typeof createClient>

export async function createQueueConnection(env: WorkerEnvironment): Promise<QueueConnection | null> {
  if (!env.REDIS_URL) {
    return null
  }

  const client = createClient({ url: env.REDIS_URL })
  await client.connect()
  return client
}
