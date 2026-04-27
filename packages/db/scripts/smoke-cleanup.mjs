import { PrismaClient } from "@prisma/client"

const p = new PrismaClient()

const cutLogs = await p.flooringCutLog.findMany({ select: { id: true } })
console.log(`Deleting ${cutLogs.length} cut log rows`)
await p.flooringCutLog.deleteMany({})

const inventories = await p.flooringInventory.findMany({
  where: { totalCutSum: { not: 0 } },
  select: { id: true, inventoryNumber: true, totalCutSum: true },
})
console.log("Inventories with non-zero totalCutSum (will reset to 0):")
console.log(inventories)
await p.flooringInventory.updateMany({
  where: { totalCutSum: { not: 0 } },
  data: { totalCutSum: 0 },
})

const orphanOutbox = await p.queueOutboxEvent.findMany({
  where: {
    topic: {
      in: [
        "flooring.cut-log.pending-save",
        "flooring.cut-log.finalize",
        "flooring.cut-log.void",
      ],
    },
  },
  select: { id: true, topic: true, status: true, idempotencyKey: true },
})
console.log(`Deleting ${orphanOutbox.length} cut-log outbox events`)
console.log(orphanOutbox)
await p.queueOutboxEvent.deleteMany({
  where: {
    topic: {
      in: [
        "flooring.cut-log.pending-save",
        "flooring.cut-log.finalize",
        "flooring.cut-log.void",
      ],
    },
  },
})

await p.$disconnect()
console.log("Cleanup done.")
