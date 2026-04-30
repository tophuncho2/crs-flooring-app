import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import { type ImportsDbClient } from "./shared.js"
import { getImportById, type ImportRecord } from "./read-repository.js"

/**
 * Create input — the worker / import-creation use case pre-resolves every FK
 * and passes scalar ids. `warehouseId` is required (schema-side); `manufacturerId`
 * is nullable.
 */
export type CreateImportRecordInput = {
  orderNumber: string | null
  tag: string | null
  notes: string | null
  warehouseId: string
  manufacturerId: string | null
}

/**
 * Update input — partial of the user-editable subset. Mirrors
 * `IMPORT_USER_EDITABLE_FIELDS` in the domain.
 */
export type UpdateImportRecordInput = Partial<CreateImportRecordInput>

export async function createImportRecord(
  input: CreateImportRecordInput,
  client: ImportsDbClient = db,
): Promise<ImportRecord> {
  const row = await client.flooringImportEntry.create({
    data: {
      orderNumber: input.orderNumber,
      tag: input.tag,
      notes: input.notes,
      warehouse: { connect: { id: input.warehouseId } },
      manufacturer: input.manufacturerId
        ? { connect: { id: input.manufacturerId } }
        : undefined,
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
  const data: Prisma.FlooringImportEntryUpdateInput = {}
  if (input.orderNumber !== undefined) data.orderNumber = input.orderNumber
  if (input.tag !== undefined) data.tag = input.tag
  if (input.notes !== undefined) data.notes = input.notes
  if (input.warehouseId !== undefined) {
    data.warehouse = { connect: { id: input.warehouseId } }
  }
  if (input.manufacturerId !== undefined) {
    data.manufacturer = input.manufacturerId
      ? { connect: { id: input.manufacturerId } }
      : { disconnect: true }
  }

  if (Object.keys(data).length > 0) {
    await client.flooringImportEntry.update({
      where: { id },
      data,
      select: { id: true },
    })
  }

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
