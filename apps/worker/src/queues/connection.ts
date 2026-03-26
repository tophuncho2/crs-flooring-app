import type { ConnectionOptions } from "bullmq"
import { parseRedisConnectionUrl } from "@builders/lib"
import type { WorkerEnvironment } from "../env.js"

export function createQueueConnection(env: WorkerEnvironment): ConnectionOptions {
  return parseRedisConnectionUrl(env.redisUrl)
}
