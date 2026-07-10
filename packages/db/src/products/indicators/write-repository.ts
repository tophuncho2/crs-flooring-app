import { Prisma } from "../../generated/prisma/client.js"
import { getIndicatorById, type InventoryIndicatorRecord } from "./read-repository.js"

// Every mutating primitive here requires a caller-managed transaction
// (`tx: Prisma.TransactionClient`). The application use case opens the
// transaction, (for update/delete) locks the indicator row FOR UPDATE via
// `lockIndicatorRow`, validates domain invariants, then applies the mutation.
// Indicators carry no derived ledger — there is no recompute step.

/**
 * Single-indicator FOR UPDATE locker — serializes concurrent writers on one
 * indicator row for update/delete. The (product, warehouse, unit) uniqueness on
 * create is enforced by the DB `@@unique`, not this lock.
 */
export async function lockIndicatorRow(
  tx: Prisma.TransactionClient,
  indicatorId: string,
): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_inventory_indicator" WHERE "id" = ${indicatorId} FOR UPDATE`,
  )
}

export type InsertIndicatorRowInput = {
  productId: string
  warehouseId: string
  unitId: string
  /** Normalized money string; "" persists as null (no threshold → neutral status). */
  lowStockThreshold: string
  /** Empty string accepted; persisted as null when blank. */
  internalNotes: string
  isActive: boolean
  /** Actor email of the creating user — stamped into both createdBy + updatedBy. */
  createdBy: string
  updatedBy: string
}

/**
 * Single-row insert. Pure persistence — the use case has already validated the
 * form and (via the DB `@@unique`) the caller surfaces a duplicate-triple
 * violation. `indicatorNumber` is DB-generated via the sequence default. Returns
 * the fully-normalized record (with live currentStock + derived status).
 */
export async function insertIndicatorRow(
  tx: Prisma.TransactionClient,
  input: InsertIndicatorRowInput,
): Promise<InventoryIndicatorRecord> {
  const inserted = await tx.flooringInventoryIndicator.create({
    data: {
      productId: input.productId,
      warehouseId: input.warehouseId,
      unitId: input.unitId,
      lowStockThreshold: input.lowStockThreshold ? input.lowStockThreshold : null,
      internalNotes: input.internalNotes ? input.internalNotes : null,
      isActive: input.isActive,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    select: { id: true },
  })
  const record = await getIndicatorById(inserted.id, tx)
  // Just inserted in this TX — always present.
  return record as InventoryIndicatorRecord
}

export type UpdateIndicatorRowPatch = {
  /** Normalized money string; "" clears (→ null). Absent leaves it untouched. */
  lowStockThreshold?: string
  /** Empty string accepted; persisted as null when blank. */
  internalNotes?: string
  isActive?: boolean
  /** Actor email of the editing user — stamped unconditionally. */
  updatedBy: string
}

export type UpdateIndicatorRowInput = {
  id: string
  patch: UpdateIndicatorRowPatch
}

/**
 * Single-row update — the editable subset only (`lowStockThreshold`,
 * `internalNotes`, `isActive`). The identity triple (product/warehouse/unit) is
 * never written here. Caller has read the row, asserted OCC, and locked it FOR
 * UPDATE. `updatedBy` is stamped unconditionally so even a metadata-only edit
 * records its editor.
 */
export async function updateIndicatorRecord(
  tx: Prisma.TransactionClient,
  input: UpdateIndicatorRowInput,
): Promise<InventoryIndicatorRecord> {
  const data: Prisma.FlooringInventoryIndicatorUpdateInput = {}
  if (input.patch.lowStockThreshold !== undefined) {
    data.lowStockThreshold = input.patch.lowStockThreshold ? input.patch.lowStockThreshold : null
  }
  if (input.patch.internalNotes !== undefined) {
    data.internalNotes = input.patch.internalNotes ? input.patch.internalNotes : null
  }
  if (input.patch.isActive !== undefined) data.isActive = input.patch.isActive
  data.updatedBy = input.patch.updatedBy

  await tx.flooringInventoryIndicator.update({
    where: { id: input.id },
    data,
    select: { id: true },
  })
  const record = await getIndicatorById(input.id, tx)
  return record as InventoryIndicatorRecord
}

export type DeleteIndicatorRowInput = {
  id: string
}

/**
 * Single-row delete. Caller has read the row, asserted OCC, and locked it FOR
 * UPDATE. Pure persistence call — any indicator is freely deletable.
 */
export async function deleteIndicatorRecordById(
  tx: Prisma.TransactionClient,
  input: DeleteIndicatorRowInput,
): Promise<void> {
  await tx.flooringInventoryIndicator.delete({ where: { id: input.id } })
}
