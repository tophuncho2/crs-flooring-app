import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import { type InventoryDbClient } from "./shared.js"
import { getInventoryById, type InventoryRecord } from "./read-repository.js"

export type CreateInventoryInput = {
  productId: string
  itemNumber: string
  dyeLot: string | null
  warehouseId: string | null
  locationId: string | null
  stockCount: string
  cost: string | null
  freight: string | null
  notes: string | null
  importEntryId: string | null
  fifoReceivedAt: Date | null
  isImported: boolean
}

export type UpdateInventoryInput = {
  itemNumber?: string
  dyeLot?: string | null
  warehouseId?: string | null
  locationId?: string | null
  stockCount?: string
  cost?: string | null
  freight?: string | null
  notes?: string | null
  isImported?: boolean
}

function buildCreateData(input: CreateInventoryInput): Prisma.FlooringInventoryCreateInput {
  const data: Prisma.FlooringInventoryCreateInput = {
    itemNumber: input.itemNumber,
    dyeLot: input.dyeLot,
    stockCount: input.stockCount,
    cost: input.cost,
    freight: input.freight,
    notes: input.notes,
    isImported: input.isImported,
    fifoReceivedAt: input.fifoReceivedAt ?? new Date(),
    product: { connect: { id: input.productId } },
  }
  if (input.warehouseId) data.warehouse = { connect: { id: input.warehouseId } }
  if (input.locationId) data.location = { connect: { id: input.locationId } }
  if (input.importEntryId) data.importEntry = { connect: { id: input.importEntryId } }
  return data
}

function buildUpdateData(input: UpdateInventoryInput): Prisma.FlooringInventoryUpdateInput {
  const data: Prisma.FlooringInventoryUpdateInput = {}
  if (input.itemNumber !== undefined) data.itemNumber = input.itemNumber
  if (input.dyeLot !== undefined) data.dyeLot = input.dyeLot
  if (input.stockCount !== undefined) data.stockCount = input.stockCount
  if (input.cost !== undefined) data.cost = input.cost
  if (input.freight !== undefined) data.freight = input.freight
  if (input.notes !== undefined) data.notes = input.notes
  if (input.isImported !== undefined) data.isImported = input.isImported
  if (input.warehouseId !== undefined) {
    data.warehouse = input.warehouseId
      ? { connect: { id: input.warehouseId } }
      : { disconnect: true }
  }
  if (input.locationId !== undefined) {
    data.location = input.locationId
      ? { connect: { id: input.locationId } }
      : { disconnect: true }
  }
  return data
}

export async function createInventory(
  input: CreateInventoryInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  const row = await client.flooringInventory.create({
    data: buildCreateData(input),
    select: { id: true },
  })
  const record = await getInventoryById(row.id, client)
  if (!record) throw new Error("createInventory: record disappeared mid-transaction")
  return record
}

export async function updateInventory(
  id: string,
  input: UpdateInventoryInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  const data = buildUpdateData(input)
  if (Object.keys(data).length === 0) {
    const existing = await getInventoryById(id, client)
    if (!existing) throw new Error(`updateInventory: inventory ${id} not found`)
    return existing
  }
  await client.flooringInventory.update({
    where: { id },
    data,
    select: { id: true },
  })
  const record = await getInventoryById(id, client)
  if (!record) throw new Error(`updateInventory: inventory ${id} disappeared mid-transaction`)
  return record
}

export async function deleteInventoryById(
  id: string,
  client: InventoryDbClient = db,
): Promise<void> {
  await client.flooringInventory.delete({ where: { id } })
}
