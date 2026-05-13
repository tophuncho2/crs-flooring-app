import { createPrismaClient } from "@builders/db"

const p = createPrismaClient()
const events = await p.queueOutboxEvent.findMany({
  orderBy: { createdAt: "desc" },
  take: 8,
  select: {
    id: true,
    topic: true,
    status: true,
    attemptCount: true,
    createdAt: true,
    dispatchedAt: true,
    lastError: true,
    idempotencyKey: true,
  },
})
console.log(JSON.stringify(events, null, 2))
await p.$disconnect()
