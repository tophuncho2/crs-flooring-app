import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import {
  normalizeInventoryAgeIndicator,
  type InventoryAgeIndicator,
  type PaletteColor,
} from "@builders/domain"

type InventoryAgeIndicatorsDbClient = PrismaClient | Prisma.TransactionClient

export type CreateInventoryAgeIndicatorRecordInput = {
  days: number
  color: PaletteColor
  createdBy: string
  updatedBy: string
}

export type UpdateInventoryAgeIndicatorRecordInput = {
  days?: number
  color?: PaletteColor
  updatedBy: string
}

export async function createInventoryAgeIndicatorRecord(
  input: CreateInventoryAgeIndicatorRecordInput,
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<InventoryAgeIndicator> {
  const indicator = await client.flooringInventoryAgeIndicator.create({
    data: {
      days: input.days,
      color: input.color,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
  })
  return normalizeInventoryAgeIndicator(indicator)
}

export async function updateInventoryAgeIndicatorRecord(
  id: string,
  input: UpdateInventoryAgeIndicatorRecordInput,
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<InventoryAgeIndicator> {
  const data: Prisma.FlooringInventoryAgeIndicatorUpdateInput = { updatedBy: input.updatedBy }
  if (input.days !== undefined) data.days = input.days
  if (input.color !== undefined) data.color = input.color

  const indicator = await client.flooringInventoryAgeIndicator.update({
    where: { id },
    data,
  })
  return normalizeInventoryAgeIndicator(indicator)
}

export async function deleteInventoryAgeIndicatorRecordById(
  id: string,
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<void> {
  await client.flooringInventoryAgeIndicator.delete({ where: { id } })
}
