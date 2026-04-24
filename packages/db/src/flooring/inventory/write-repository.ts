import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import { type InventoryDbClient } from "./shared.js"
import { getInventoryById, type InventoryRecord } from "./read-repository.js"

/**
 * Create input for a real inventory row. Every field is worker-owned — the
 * worker materializes staged rows into real inventory at import time, stamping
 * `costPerUnit` / `freightPerUnit` / `coveragePerUnit` / `categorySlug` as
 * needed and picking up the FIFO timestamp. User flows never call this
 * directly. `categorySlug` is a point-in-time snapshot of the product's
 * category slug (same pattern as `FlooringProduct.manufacturerName`); the
 * product-level `isProductCategoryChangeBlocked` rule prevents drift after
 * inventory exists.
 */
export type CreateInventoryRecordInput = {
  importEntryId: string | null
  productId: string
  categorySlug: string
  itemNumber: string
  dyeLot: string | null
  warehouseId: string
  locationId: string | null
  startingStock: Prisma.Decimal | string | number
  cost: Prisma.Decimal | string | number | null
  freight: Prisma.Decimal | string | number | null
  costPerUnit: Prisma.Decimal | string | number | null
  freightPerUnit: Prisma.Decimal | string | number | null
  coveragePerUnit: Prisma.Decimal | string | number | null
  notes: string | null
  fifoReceivedAt: Date
}

/**
 * Update input — editable subset only. Mirrors domain.editability
 * INVENTORY_EDITABLE_FIELDS. Immutable fields (startingStock, cost, freight,
 * cost/freight/coverage-per-unit, importEntryId, productId, categorySlug,
 * fifoReceivedAt) are deliberately absent from this shape.
 */
export type UpdateInventoryRecordInput = {
  itemNumber?: string
  dyeLot?: string | null
  warehouseId?: string
  locationId?: string | null
  notes?: string | null
  isArchived?: boolean
}

/**
 * Transactional helper — only called inside cut-log write transactions so the
 * `totalCutSum` running total stays in sync with the cut-log rows. Regular
 * user / worker code should never touch this directly.
 */
export type UpdateInventoryTotalCutSumInput = {
  totalCutSum: Prisma.Decimal | string | number
}

function buildCreateData(
  input: CreateInventoryRecordInput,
): Prisma.FlooringInventoryCreateInput {
  const data: Prisma.FlooringInventoryCreateInput = {
    product: { connect: { id: input.productId } },
    warehouse: { connect: { id: input.warehouseId } },
    categorySlug: input.categorySlug,
    itemNumber: input.itemNumber,
    dyeLot: input.dyeLot,
    startingStock: input.startingStock,
    cost: input.cost,
    freight: input.freight,
    costPerUnit: input.costPerUnit,
    freightPerUnit: input.freightPerUnit,
    coveragePerUnit: input.coveragePerUnit,
    notes: input.notes,
    fifoReceivedAt: input.fifoReceivedAt,
  }
  if (input.locationId) data.location = { connect: { id: input.locationId } }
  if (input.importEntryId) data.importEntry = { connect: { id: input.importEntryId } }
  return data
}

function buildUpdateData(
  input: UpdateInventoryRecordInput,
): Prisma.FlooringInventoryUpdateInput {
  const data: Prisma.FlooringInventoryUpdateInput = {}
  if (input.itemNumber !== undefined) data.itemNumber = input.itemNumber
  if (input.dyeLot !== undefined) data.dyeLot = input.dyeLot
  if (input.warehouseId !== undefined) {
    data.warehouse = { connect: { id: input.warehouseId } }
  }
  if (input.locationId !== undefined) {
    data.location = input.locationId
      ? { connect: { id: input.locationId } }
      : { disconnect: true }
  }
  if (input.notes !== undefined) data.notes = input.notes
  if (input.isArchived !== undefined) data.isArchived = input.isArchived
  return data
}

export async function createInventoryRecord(
  input: CreateInventoryRecordInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  const row = await client.flooringInventory.create({
    data: buildCreateData(input),
    select: { id: true },
  })
  const record = await getInventoryById(row.id, client)
  if (!record) throw new Error("createInventoryRecord: record disappeared mid-transaction")
  return record
}

export async function updateInventoryRecord(
  id: string,
  input: UpdateInventoryRecordInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  const data = buildUpdateData(input)
  if (Object.keys(data).length > 0) {
    await client.flooringInventory.update({
      where: { id },
      data,
      select: { id: true },
    })
  }
  const record = await getInventoryById(id, client)
  if (!record) throw new Error(`updateInventoryRecord: inventory ${id} not found after update`)
  return record
}

export async function updateInventoryTotalCutSum(
  id: string,
  input: UpdateInventoryTotalCutSumInput,
  client: InventoryDbClient = db,
): Promise<InventoryRecord> {
  await client.flooringInventory.update({
    where: { id },
    data: { totalCutSum: input.totalCutSum },
    select: { id: true },
  })
  const record = await getInventoryById(id, client)
  if (!record) {
    throw new Error(`updateInventoryTotalCutSum: inventory ${id} not found after update`)
  }
  return record
}

export async function deleteInventoryRecordById(
  id: string,
  client: InventoryDbClient = db,
): Promise<void> {
  await client.flooringInventory.delete({ where: { id } })
}
