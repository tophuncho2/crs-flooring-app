import type { Prisma } from "@prisma/client"
import {
  assertCutLogLinkageSymmetry,
  assertCutLogVoidStatusConsistency,
  buildVoidedCutLogPatch,
} from "@builders/domain"
import {
  getCutLogById,
  type CutLogRecord,
} from "./read-repository.js"

/**
 * Create input for a cut log. Status always starts as `PENDING`. The
 * worker-only fields (`before` / `after` / `cost` / `freight`) and the
 * `void` flag are not accepted on create — they're stamped later by the
 * FINAL transition or the void flow.
 *
 * `coverageCut` is the per-row coverage snapshot. Caller (use case) computes
 * it via the domain helper `computeCutCoverage({ cut, coveragePerUnit,
 * category })` BEFORE invoking this primitive — keeps the math in one place.
 */
export type CreateCutLogRecordInput = {
  inventoryId: string
  cut: Prisma.Decimal | string | number
  coverageCut: Prisma.Decimal | string | number | null
  workOrderId: string | null
  workOrderItemId: string | null
  notes: string | null
  isWaste: boolean
}

/**
 * Pending-save patch — only the user-editable PENDING fields are accepted.
 * `coverageCut` is recomputed by the caller (use case) and passed in
 * alongside `cut` so this primitive stays a pure write.
 */
export type UpdateCutLogPendingInput = {
  cut?: Prisma.Decimal | string | number
  coverageCut?: Prisma.Decimal | string | number | null
  notes?: string | null
}

/**
 * Worker-only finalize input. Sets `status = FINAL` and stamps the five
 * computed fields atomically.
 */
export type FinalizeCutLogRecordInput = {
  before: Prisma.Decimal | string | number
  after: Prisma.Decimal | string | number
  cost: Prisma.Decimal | string | number | null
  freight: Prisma.Decimal | string | number | null
  coverageCut: Prisma.Decimal | string | number | null
}

// Every mutating primitive in this file requires a caller-managed transaction
// (`tx: Prisma.TransactionClient` as the first argument). The application use
// case opens the transaction, locks the parent inventory row `FOR UPDATE`,
// validates domain invariants, applies the cut-log mutation via these
// primitives, and adjusts `inventory.totalCutSum` in the same transaction.

export async function createCutLogRecord(
  tx: Prisma.TransactionClient,
  input: CreateCutLogRecordInput,
): Promise<CutLogRecord> {
  assertCutLogLinkageSymmetry({
    workOrderId: input.workOrderId,
    workOrderItemId: input.workOrderItemId,
  })
  assertCutLogVoidStatusConsistency({
    status: "PENDING",
    void: false,
  })
  const row = await tx.flooringCutLog.create({
    data: {
      inventory: { connect: { id: input.inventoryId } },
      cut: input.cut,
      coverageCut: input.coverageCut,
      before: 0,
      after: 0,
      status: "PENDING",
      cost: null,
      freight: null,
      isWaste: input.isWaste,
      void: false,
      notes: input.notes,
      ...(input.workOrderId
        ? { workOrder: { connect: { id: input.workOrderId } } }
        : {}),
      ...(input.workOrderItemId
        ? { workOrderItem: { connect: { id: input.workOrderItemId } } }
        : {}),
    },
    select: { id: true },
  })
  const record = await getCutLogById(row.id, tx)
  if (!record) {
    throw new Error("createCutLogRecord: record disappeared mid-transaction")
  }
  return record
}

function buildPendingUpdateData(
  input: UpdateCutLogPendingInput,
): Prisma.FlooringCutLogUpdateInput {
  const data: Prisma.FlooringCutLogUpdateInput = {}
  if (input.cut !== undefined) data.cut = input.cut
  if (input.coverageCut !== undefined) data.coverageCut = input.coverageCut
  if (input.notes !== undefined) data.notes = input.notes
  return data
}

export async function updateCutLogPending(
  tx: Prisma.TransactionClient,
  id: string,
  input: UpdateCutLogPendingInput,
): Promise<CutLogRecord> {
  const data = buildPendingUpdateData(input)
  if (Object.keys(data).length > 0) {
    await tx.flooringCutLog.update({
      where: { id },
      data,
      select: { id: true },
    })
  }
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`updateCutLogPending: cut log ${id} not found after update`)
  }
  return record
}

export async function voidCutLogRecord(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<CutLogRecord> {
  const patch = buildVoidedCutLogPatch()
  assertCutLogVoidStatusConsistency({
    status: patch.status,
    void: patch.void,
  })
  await tx.flooringCutLog.update({
    where: { id },
    data: {
      cut: patch.cut,
      coverageCut: patch.coverageCut,
      before: patch.before,
      after: patch.after,
      cost: patch.cost,
      freight: patch.freight,
      isWaste: patch.isWaste,
      void: patch.void,
      status: patch.status,
      workOrder: { disconnect: true },
      workOrderItem: { disconnect: true },
    },
    select: { id: true },
  })
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`voidCutLogRecord: cut log ${id} not found after void`)
  }
  return record
}

export async function finalizeCutLogRecord(
  tx: Prisma.TransactionClient,
  id: string,
  input: FinalizeCutLogRecordInput,
): Promise<CutLogRecord> {
  await tx.flooringCutLog.update({
    where: { id },
    data: {
      before: input.before,
      after: input.after,
      cost: input.cost,
      freight: input.freight,
      coverageCut: input.coverageCut,
      status: "FINAL",
    },
    select: { id: true },
  })
  const record = await getCutLogById(id, tx)
  if (!record) {
    throw new Error(`finalizeCutLogRecord: cut log ${id} not found after finalize`)
  }
  return record
}

export async function deleteCutLogRecordById(
  tx: Prisma.TransactionClient,
  id: string,
): Promise<void> {
  await tx.flooringCutLog.delete({ where: { id } })
}
