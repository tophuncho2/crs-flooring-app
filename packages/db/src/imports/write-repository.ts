import type { PaletteColor } from "@builders/domain"
import { Prisma } from "../generated/prisma/client.js"
import { db } from "../client.js"
import { type ImportsDbClient } from "./shared.js"

export async function lockImportRow(
  tx: Prisma.TransactionClient,
  importEntryId: string,
): Promise<void> {
  await tx.$queryRaw(
    Prisma.sql`SELECT "id" FROM "flooring_import_entry" WHERE "id" = ${importEntryId} FOR UPDATE`,
  )
}

/**
 * Aggregate-root actor touch. The import is the aggregate root; its staged /
 * filter rows carry no actor of their own, so any HUMAN mutation to a child row
 * stamps the parent's `updatedBy` here (Prisma `@updatedAt` bumps `updatedAt`).
 * Callers MUST already hold the parent lock (`lockImportRow`) in the same
 * transaction. The worker materialize path deliberately does NOT call this.
 */
export async function stampImportActor(
  tx: Prisma.TransactionClient,
  importEntryId: string,
  actorEmail: string,
): Promise<void> {
  await tx.flooringImportEntry.update({
    where: { id: importEntryId },
    data: { updatedBy: actorEmail },
    select: { id: true },
  })
}

/**
 * Create input — the worker / import-creation use case pre-resolves every FK
 * and passes scalar ids. `warehouseId` is required (schema-side); `entityId`
 * is nullable. `createdBy`/`updatedBy` are the actor email, stamped by the
 * application layer (aggregate-root actor — see `stampImportActor`).
 */
export type CreateImportRecordInput = {
  purchaseOrderNumber: string | null
  internalNotes: string | null
  warehouseId: string
  entityId: string | null
  createdBy: string
  updatedBy: string
}

/**
 * Update input — partial of the user-editable columns plus an always-present
 * `updatedBy` actor stamp. `createdBy` is immutable post-create. `color` is
 * the editable palette tag — added explicitly here (not on the create input, so
 * new rows fall to the DB default SLATE); a non-semantic visual tag carried
 * through unread.
 */
export type UpdateImportRecordInput = Partial<
  Omit<CreateImportRecordInput, "createdBy" | "updatedBy">
> & { updatedBy: string; color?: PaletteColor }

/**
 * Lean write — returns only the new row's id. The full multi-relation record is
 * read on the pool by the caller AFTER the transaction commits: a re-read whose
 * select pulls 2+ relations run on the pinned interactive-transaction connection
 * fires concurrent relation sub-queries on one pg connection ("client is already
 * executing a query") and wedges it.
 */
export async function createImportRecord(
  input: CreateImportRecordInput,
  client: ImportsDbClient = db,
): Promise<{ id: string }> {
  return client.flooringImportEntry.create({
    data: {
      purchaseOrderNumber: input.purchaseOrderNumber,
      internalNotes: input.internalNotes,
      warehouse: { connect: { id: input.warehouseId } },
      entity: input.entityId ? { connect: { id: input.entityId } } : undefined,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    select: { id: true },
  })
}

/**
 * Lean write — returns only the row's id. The caller enriches the full
 * multi-relation record on the pool after the transaction commits (see the
 * note on `createImportRecord`).
 */
export async function updateImportRecord(
  id: string,
  input: UpdateImportRecordInput,
  client: ImportsDbClient = db,
): Promise<{ id: string }> {
  // `updatedBy` is always stamped (aggregate-root actor), so the update always
  // runs — even when no user-editable field changed, the actor + `updatedAt`
  // must move.
  const data: Prisma.FlooringImportEntryUpdateInput = { updatedBy: input.updatedBy }
  if (input.purchaseOrderNumber !== undefined) data.purchaseOrderNumber = input.purchaseOrderNumber
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes
  if (input.warehouseId !== undefined) {
    data.warehouse = { connect: { id: input.warehouseId } }
  }
  if (input.entityId !== undefined) {
    data.entity = input.entityId ? { connect: { id: input.entityId } } : { disconnect: true }
  }
  if (input.color !== undefined) data.color = input.color

  return client.flooringImportEntry.update({
    where: { id },
    data,
    select: { id: true },
  })
}

export async function deleteImportRecordById(
  id: string,
  client: ImportsDbClient = db,
): Promise<void> {
  await client.flooringImportEntry.delete({ where: { id } })
}
