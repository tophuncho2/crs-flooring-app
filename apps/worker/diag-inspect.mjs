// One-shot diagnostic: dump recent outbox events for the cut-log finalize topic
// AND the live BullMQ queue counts/jobs.
import { PrismaClient } from "@prisma/client"
import { Queue } from "bullmq"
import IORedis from "ioredis"

const prisma = new PrismaClient()

const TOPIC = "flooring.work-order.cut-log.finalize"
const QUEUE_NAME = "flooring-work-order-cut-log-finalize"

const redisUrl = process.env.REDIS_URL ?? process.env.QUEUE_REDIS_URL
if (!redisUrl) {
  console.error("Missing REDIS_URL")
  process.exit(2)
}

const connection = new IORedis(redisUrl, { maxRetriesPerRequest: null })
const queue = new Queue(QUEUE_NAME, { connection })

try {
  const outbox = await prisma.queueOutboxEvent.findMany({
    where: { topic: TOPIC },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      topic: true,
      status: true,
      attemptCount: true,
      lastError: true,
      idempotencyKey: true,
      createdAt: true,
      dispatchedAt: true,
      lockedBy: true,
    },
  })
  console.log("=== Recent outbox events for", TOPIC, "===")
  for (const e of outbox) {
    console.log(JSON.stringify(e, null, 2))
  }

  console.log("\n=== BullMQ queue counts (", QUEUE_NAME, ") ===")
  const counts = await queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  )
  console.log(JSON.stringify(counts, null, 2))

  console.log("\n=== Recent jobs (waiting, active, failed, completed last 5) ===")
  const waiting = await queue.getJobs(["waiting"], 0, 9)
  const active = await queue.getJobs(["active"], 0, 9)
  const failed = await queue.getJobs(["failed"], 0, 9)
  const completed = await queue.getJobs(["completed"], 0, 4)

  const dump = (label, jobs) => {
    console.log(`-- ${label}: ${jobs.length}`)
    for (const j of jobs) {
      console.log(
        JSON.stringify(
          {
            id: j.id,
            name: j.name,
            timestamp: new Date(j.timestamp).toISOString(),
            attemptsMade: j.attemptsMade,
            data: j.data,
            failedReason: j.failedReason,
            returnvalue: j.returnvalue,
          },
          null,
          2,
        ),
      )
    }
  }
  dump("waiting", waiting)
  dump("active", active)
  dump("failed", failed)
  dump("completed", completed)

  console.log("\n=== Workers connected to queue ===")
  const workers = await queue.getWorkers()
  console.log(JSON.stringify(workers, null, 2))
} catch (err) {
  console.error("Diagnostic error:", err)
  process.exitCode = 1
} finally {
  await queue.close()
  await connection.quit()
  await prisma.$disconnect()
}
