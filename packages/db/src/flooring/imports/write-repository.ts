import type { PaletteColor } from "@builders/domain"
import { Prisma } from "../../generated/prisma/client.js"
import { db } from "../../client.js"
import { type ImportsDbClient } from "./shared.js"
import { getImportById, type ImportRecord } from "./read-repository.js"

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
 * and passes scalar ids. `warehouseId` is required (schema-side); `manufacturerId`
 * is nullable. `createdBy`/`updatedBy` are the actor email, stamped by the
 * application layer (aggregate-root actor — see `stampImportActor`).
 */
export type CreateImportRecordInput = {
  purchaseOrderNumber: string | null
  internalNotes: string | null
  warehouseId: string
  manufacturerId: string | null
  entityId: string | null
  createdBy: string
  updatedBy: string
}

/**
 * Update input — partial of the user-editable subset (mirrors
 * `IMPORT_USER_EDITABLE_FIELDS` in the domain) plus an always-present
 * `updatedBy` actor stamp. `createdBy` is immutable post-create. `color` is
 * the editable palette tag — added explicitly here (not on the create input, so
 * new rows fall to the DB default SLATE); a non-semantic visual tag carried
 * through unread.
 */
export type UpdateImportRecordInput = Partial<
  Omit<CreateImportRecordInput, "createdBy" | "updatedBy">
> & { updatedBy: string; color?: PaletteColor }

export async function createImportRecord(
  input: CreateImportRecordInput,
  client: ImportsDbClient = db,
): Promise<ImportRecord> {
  const row = await client.flooringImportEntry.create({
    data: {
      purchaseOrderNumber: input.purchaseOrderNumber,
      internalNotes: input.internalNotes,
      warehouse: { connect: { id: input.warehouseId } },
      manufacturer: input.manufacturerId
        ? { connect: { id: input.manufacturerId } }
        : undefined,
      entity: input.entityId ? { connect: { id: input.entityId } } : undefined,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
    select: { id: true },
  })
  const record = await getImportById(row.id, client)
  if (!record) throw new Error("createImportRecord: record disappeared mid-transaction")
  return record
}

export async function updateImportRecord(
  id: string,
  input: UpdateImportRecordInput,
  client: ImportsDbClient = db,
): Promise<ImportRecord> {
  // `updatedBy` is always stamped (aggregate-root actor), so the update always
  // runs — even when no user-editable field changed, the actor + `updatedAt`
  // must move.
  const data: Prisma.FlooringImportEntryUpdateInput = { updatedBy: input.updatedBy }
  if (input.purchaseOrderNumber !== undefined) data.purchaseOrderNumber = input.purchaseOrderNumber
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes
  if (input.warehouseId !== undefined) {
    data.warehouse = { connect: { id: input.warehouseId } }
  }
  if (input.manufacturerId !== undefined) {
    data.manufacturer = input.manufacturerId
      ? { connect: { id: input.manufacturerId } }
      : { disconnect: true }
  }
  if (input.entityId !== undefined) {
    data.entity = input.entityId ? { connect: { id: input.entityId } } : { disconnect: true }
  }
  if (input.color !== undefined) data.color = input.color

  await client.flooringImportEntry.update({
    where: { id },
    data,
    select: { id: true },
  })

  const record = await getImportById(id, client)
  if (!record) throw new Error(`updateImportRecord: import ${id} not found after update`)
  return record
}

export async function deleteImportRecordById(
  id: string,
  client: ImportsDbClient = db,
): Promise<void> {
  await client.flooringImportEntry.delete({ where: { id } })
}
