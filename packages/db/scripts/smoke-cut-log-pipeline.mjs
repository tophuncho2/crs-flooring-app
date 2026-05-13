#!/usr/bin/env node
/**
 * End-to-end smoke test for the cut-log worker pipeline (sweeps 1-5).
 *
 * Prerequisites:
 *  - Postgres reachable via DATABASE_URL.
 *  - Redis reachable via QUEUE_REDIS_URL or REDIS_URL.
 *  - Relay process running:   npm run start --workspace @builders/relay
 *  - Worker process running:  npm run start --workspace @builders/worker
 *
 * What this exercises:
 *  1. saveCutLogPendingDiffUseCase    → creates 1 pending cut log via diff
 *  2. markCutLogsForFinalizeUseCase   → flips it PENDING → QUEUED, worker stamps FINAL + finalCutSequence
 *  3. markCutLogForVoidUseCase        → flips it FINAL → QUEUED, worker erases values + sets VOID
 *
 * Each step:
 *  - Calls the producer use case (writes outbox event).
 *  - Polls the relevant DB row until the worker has applied the expected
 *    state change. Times out at MAX_POLL_MS.
 *  - Logs each transition with a timestamp delta.
 *
 * Cleanup at the end deletes the smoke cut log and resets the inventory's
 * totalCutSum to 0 (it should already be 0 by the void step, but defensive).
 */

import { randomUUID } from "node:crypto"
import { createPrismaClient } from "@builders/db"
import {
  markCutLogForVoidUseCase,
  markCutLogsForFinalizeUseCase,
  saveCutLogPendingDiffUseCase,
} from "@builders/application"

const prisma = createPrismaClient()

const MAX_POLL_MS = 30_000
const POLL_INTERVAL_MS = 500

const requestedBy = {
  userId: "00000000-0000-4000-8000-000000000000",
  userEmail: "smoke-test@example.com",
}

function nowIso() {
  return new Date().toISOString()
}

function ms(start) {
  return `${Date.now() - start}ms`
}

async function pollFor(predicate, label) {
  const start = Date.now()
  while (Date.now() - start < MAX_POLL_MS) {
    const result = await predicate()
    if (result !== null && result !== undefined) {
      console.log(`  ✓ [${label}] reached after ${ms(start)}`)
      return result
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
  throw new Error(`[${label}] timed out after ${MAX_POLL_MS}ms`)
}

async function readOutboxState(idempotencyKey) {
  return prisma.queueOutboxEvent.findUnique({
    where: { idempotencyKey },
    select: { id: true, status: true, attemptCount: true, topic: true },
  })
}

async function pickInventory() {
  const inventory = await prisma.flooringInventory.findFirst({
    select: {
      id: true,
      inventoryNumber: true,
      startingStock: true,
      totalCutSum: true,
      coveragePerUnit: true,
      categorySlug: true,
    },
  })
  if (!inventory) {
    throw new Error("No inventory rows in DB — smoke needs at least one to attach cut logs to.")
  }
  return inventory
}

async function snapshotInventory(id) {
  return prisma.flooringInventory.findUnique({
    where: { id },
    select: { totalCutSum: true },
  })
}

async function snapshotCutLog(id) {
  return prisma.flooringCutLog.findUnique({
    where: { id },
    select: {
      id: true,
      cutLogNumber: true,
      status: true,
      isFinal: true,
      finalCutSequence: true,
      void: true,
      cut: true,
      coverageCut: true,
      cost: true,
      freight: true,
      before: true,
      after: true,
      createdAt: true,
    },
  })
}

async function listCutLogsForInventory(inventoryId) {
  return prisma.flooringCutLog.findMany({
    where: { inventoryId },
    select: { id: true },
  })
}

async function deleteCutLog(id) {
  await prisma.flooringCutLog.delete({ where: { id } })
}

async function resetInventoryTotalCutSum(id) {
  await prisma.flooringInventory.update({
    where: { id },
    data: { totalCutSum: 0 },
  })
}

const TEMP_ID = `smoke-draft-${randomUUID()}`
const SMOKE_CUT_VALUE = "10.00"

// Hoisted so the `finally` block can clean up regardless of where main()
// fails (e.g. an assertion in the middle of step 2 leaves a created cut
// log behind that needs deleting).
let smokeCutLogId = null
let smokeInventoryId = null

async function main() {
  console.log("=".repeat(72))
  console.log(`SMOKE: cut-log worker pipeline   ${nowIso()}`)
  console.log("=".repeat(72))

  const inventory = await pickInventory()
  smokeInventoryId = inventory.id
  console.log("\nUsing inventory:", inventory)

  // -----------------------------------------------------------------------
  // STEP 1 — saveCutLogPendingDiffUseCase
  // -----------------------------------------------------------------------
  console.log("\n[STEP 1] saveCutLogPendingDiffUseCase — create 1 pending cut log via diff")
  const saveStart = Date.now()
  const saveResult = await saveCutLogPendingDiffUseCase({
    inventoryId: inventory.id,
    diff: {
      added: [
        {
          tempId: TEMP_ID,
          cut: SMOKE_CUT_VALUE,
          cost: "100.00",
          freight: "5.00",
          isWaste: false,
          notes: "smoke test",
        },
      ],
      modified: [],
      deleted: [],
    },
    requestedBy,
  })
  console.log(`  producer returned in ${ms(saveStart)}:`, {
    outboxEventId: saveResult.outboxEventId,
    wasDuplicate: saveResult.wasDuplicate,
    tempIdMap: saveResult.tempIdMap,
  })

  const newCutLogId = saveResult.tempIdMap[TEMP_ID]
  if (!newCutLogId) {
    throw new Error("smoke: producer did not return a cut log id for the smoke tempId")
  }
  smokeCutLogId = newCutLogId

  const initialCutLog = await pollFor(
    async () => snapshotCutLog(newCutLogId),
    "STEP 1 — cut log row applied by worker",
  )
  console.log("  worker-applied cut log:", initialCutLog)

  const inventoryAfterSave = await snapshotInventory(inventory.id)
  console.log("  inventory.totalCutSum after save:", inventoryAfterSave.totalCutSum.toString())
  if (Number(inventoryAfterSave.totalCutSum) !== Number(SMOKE_CUT_VALUE)) {
    throw new Error(
      `smoke: expected totalCutSum=${SMOKE_CUT_VALUE} after save, got ${inventoryAfterSave.totalCutSum.toString()}`,
    )
  }

  // -----------------------------------------------------------------------
  // STEP 2 — markCutLogsForFinalizeUseCase
  // -----------------------------------------------------------------------
  console.log("\n[STEP 2] markCutLogsForFinalizeUseCase — mark + worker stamps FINAL")
  const finalizeStart = Date.now()
  const finalizeResult = await markCutLogsForFinalizeUseCase({
    inventoryId: inventory.id,
    cutLogIds: [newCutLogId],
    requestedBy,
  })
  console.log(`  producer returned in ${ms(finalizeStart)}:`, finalizeResult)

  const finalizedCutLog = await pollFor(
    async () => {
      const row = await snapshotCutLog(newCutLogId)
      return row && row.status === "FINAL" && row.isFinal === true ? row : null
    },
    "STEP 2 — cut log status=FINAL, isFinal=true, finalCutSequence stamped",
  )
  console.log("  worker-finalized cut log:", finalizedCutLog)

  if (finalizedCutLog.finalCutSequence !== 1) {
    throw new Error(
      `smoke: expected finalCutSequence=1 (first finalized cut on this inventory), got ${finalizedCutLog.finalCutSequence}`,
    )
  }
  if (Number(finalizedCutLog.before) !== Number(inventory.startingStock)) {
    throw new Error(
      `smoke: expected before=${Number(inventory.startingStock)} (no prior finalized cuts), got ${finalizedCutLog.before.toString()}`,
    )
  }
  const expectedAfter = Number(inventory.startingStock) - Number(SMOKE_CUT_VALUE)
  if (Number(finalizedCutLog.after) !== expectedAfter) {
    throw new Error(
      `smoke: expected after=${expectedAfter} (startingStock - cut), got ${finalizedCutLog.after.toString()}`,
    )
  }

  const inventoryAfterFinalize = await snapshotInventory(inventory.id)
  console.log("  inventory.totalCutSum after finalize:", inventoryAfterFinalize.totalCutSum.toString())
  if (Number(inventoryAfterFinalize.totalCutSum) !== Number(SMOKE_CUT_VALUE)) {
    throw new Error(
      `smoke: totalCutSum should not change on finalize; expected ${SMOKE_CUT_VALUE}, got ${inventoryAfterFinalize.totalCutSum.toString()}`,
    )
  }

  // -----------------------------------------------------------------------
  // STEP 3 — markCutLogForVoidUseCase
  // -----------------------------------------------------------------------
  console.log("\n[STEP 3] markCutLogForVoidUseCase — mark + worker applies void patch")
  const voidStart = Date.now()
  const voidResult = await markCutLogForVoidUseCase({
    inventoryId: inventory.id,
    cutLogId: newCutLogId,
    requestedBy,
  })
  console.log(`  producer returned in ${ms(voidStart)}:`, voidResult)

  const voidedCutLog = await pollFor(
    async () => {
      const row = await snapshotCutLog(newCutLogId)
      return row && row.status === "VOID" && row.void === true ? row : null
    },
    "STEP 3 — cut log status=VOID, void=true, cut/cost/freight/coverageCut erased",
  )
  console.log("  worker-voided cut log:", voidedCutLog)

  if (Number(voidedCutLog.cut) !== 0) {
    throw new Error(`smoke: expected cut=0 after void, got ${voidedCutLog.cut.toString()}`)
  }
  if (voidedCutLog.cost !== null) {
    throw new Error(`smoke: expected cost=null after void, got ${voidedCutLog.cost}`)
  }
  if (voidedCutLog.freight !== null) {
    throw new Error(`smoke: expected freight=null after void, got ${voidedCutLog.freight}`)
  }
  if (voidedCutLog.coverageCut !== null) {
    throw new Error(`smoke: expected coverageCut=null after void, got ${voidedCutLog.coverageCut}`)
  }
  // isFinal + finalCutSequence preserved as historical record
  if (voidedCutLog.isFinal !== true) {
    throw new Error("smoke: void should preserve isFinal=true as historical record")
  }
  if (voidedCutLog.finalCutSequence !== 1) {
    throw new Error(
      "smoke: void should preserve finalCutSequence=1 as historical record",
    )
  }

  const inventoryAfterVoid = await snapshotInventory(inventory.id)
  console.log("  inventory.totalCutSum after void:", inventoryAfterVoid.totalCutSum.toString())
  if (Number(inventoryAfterVoid.totalCutSum) !== 0) {
    throw new Error(
      `smoke: expected totalCutSum=0 after void (the only non-void cut was erased), got ${inventoryAfterVoid.totalCutSum.toString()}`,
    )
  }

  // -----------------------------------------------------------------------
  // OUTBOX EVENT LIFECYCLE INSPECTION
  // -----------------------------------------------------------------------
  console.log("\n[INSPECT] Outbox event lifecycle for the 3 events this smoke produced")
  const events = await prisma.queueOutboxEvent.findMany({
    where: { aggregateId: inventory.id },
    orderBy: { createdAt: "desc" },
    take: 3,
    select: {
      id: true,
      topic: true,
      status: true,
      attemptCount: true,
      createdAt: true,
      dispatchedAt: true,
    },
  })
  for (const event of events) {
    console.log("  -", event)
  }

  return { newCutLogId, inventoryId: inventory.id, events }
}

let result
try {
  result = await main()
  console.log("\n" + "=".repeat(72))
  console.log("SMOKE PASSED")
  console.log("=".repeat(72))
} catch (error) {
  console.error("\n" + "=".repeat(72))
  console.error("SMOKE FAILED:", error.message)
  console.error("=".repeat(72))
  console.error(error)
  process.exitCode = 1
} finally {
  // Cleanup — delete smoke cut log + reset inventory total. Uses the
  // hoisted top-level vars so this runs even if main() failed midway.
  if (smokeCutLogId) {
    try {
      await deleteCutLog(smokeCutLogId)
      console.log(`\n[CLEANUP] Deleted smoke cut log ${smokeCutLogId}`)
    } catch (cleanupError) {
      console.error("[CLEANUP] Failed to delete smoke cut log:", cleanupError.message)
    }
  }
  if (smokeInventoryId) {
    try {
      await resetInventoryTotalCutSum(smokeInventoryId)
      console.log(`[CLEANUP] Reset inventory ${smokeInventoryId} totalCutSum to 0`)
    } catch (cleanupError) {
      console.error("[CLEANUP] Failed to reset inventory totalCutSum:", cleanupError.message)
    }
  }
  await prisma.$disconnect()
}
