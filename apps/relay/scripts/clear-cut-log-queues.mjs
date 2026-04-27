import { Queue } from "bullmq"
import { parseRedisConnectionUrl } from "@builders/lib"

const url = process.env.QUEUE_REDIS_URL ?? process.env.REDIS_URL
const connection = parseRedisConnectionUrl(url)

const queues = [
  "flooring-cut-log-pending-save",
  "flooring-cut-log-finalize",
  "flooring-cut-log-void",
]

for (const name of queues) {
  const q = new Queue(name, { connection })
  // obliterate removes ALL jobs in any state from the queue
  await q.obliterate({ force: true })
  console.log(`obliterated ${name}`)
  await q.close()
}
process.exit(0)
