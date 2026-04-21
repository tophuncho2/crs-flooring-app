import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import { importRowSelect, type ImportsDbClient } from "./shared.js"
import { normalizeImportRow, type ImportRecord } from "./read-repository.js"

export type CreateImportInput = {
  orderNumber: string | null
  tag: string | null
  transportType: string
  status: string
  notes: string | null
  warehouseId: string | null
}

export type UpdateImportInput = {
  orderNumber?: string | null
  tag?: string | null
  transportType?: string
  status?: string
  notes?: string | null
  warehouseId?: string | null
}

export async function createImport(
  input: CreateImportInput,
  client: ImportsDbClient = db,
): Promise<ImportRecord> {
  const row = await client.flooringImportEntry.create({
    data: {
      orderNumber: input.orderNumber,
      tag: input.tag,
      transportType: input.transportType,
      status: input.status,
      notes: input.notes,
      warehouseId: input.warehouseId,
    },
    select: importRowSelect,
  })
  return normalizeImportRow(row)
}

export async function updateImport(
  id: string,
  input: UpdateImportInput,
  client: ImportsDbClient = db,
): Promise<ImportRecord> {
  const data: Prisma.FlooringImportEntryUpdateInput = {}
  if (input.orderNumber !== undefined) data.orderNumber = input.orderNumber
  if (input.tag !== undefined) data.tag = input.tag
  if (input.transportType !== undefined) data.transportType = input.transportType
  if (input.status !== undefined) data.status = input.status
  if (input.notes !== undefined) data.notes = input.notes
  if (input.warehouseId !== undefined) {
    data.warehouse = input.warehouseId
      ? { connect: { id: input.warehouseId } }
      : { disconnect: true }
  }

  const row = await client.flooringImportEntry.update({
    where: { id },
    data,
    select: importRowSelect,
  })
  return normalizeImportRow(row)
}

export async function deleteImportById(
  id: string,
  client: ImportsDbClient = db,
): Promise<void> {
  await client.flooringImportEntry.delete({ where: { id } })
}
