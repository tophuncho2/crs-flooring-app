import { Queue } from "bullmq"
import { parseRedisConnectionUrl } from "@builders/lib"

const url = process.env.QUEUE_REDIS_URL ?? process.env.REDIS_URL
const connection = parseRedisConnectionUrl(url)

const queues = [
  "flooring-cut-log-pending-save",
  "flooring-cut-log-finalize",
  "flooring-cut-log-void",
  "flooring-imports-materialize",
]

for (const name of queues) {
  const q = new Queue(name, { connection })
  const counts = await q.getJobCounts(
    "active",
    "completed",
    "delayed",
    "failed",
    "waiting",
  )
  const lastJobs = await q.getJobs(["completed", "failed", "active", "waiting", "delayed"], 0, 5)
  console.log(`\n=== ${name} ===`)
  console.log("counts:", counts)
  for (const j of lastJobs) {
    console.log(`  job ${j.id} | state-attempts=${j.attemptsStarted}/${j.opts.attempts ?? 1} | name=${j.name}`)
  }
  await q.close()
}
process.exit(0)
