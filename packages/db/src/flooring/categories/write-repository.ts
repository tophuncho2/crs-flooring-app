import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import { categoryInclude, normalizeCategoryRow, type CategoryRecord } from "./read-repository.js"

type CategoryDbClient = PrismaClient | Prisma.TransactionClient

export type CategoryFormInput = {
  name: string
  sendUnitId: string
  stockUnitId: string
  coverageAvailableUnitId: string
  itemCoverageUnitId: string
  serviceUnitId: string
}

export async function createCategoryRecord(
  input: CategoryFormInput,
  client: CategoryDbClient = db,
): Promise<CategoryRecord> {
  const row = await client.flooringCategory.create({
    data: {
      name: input.name.trim(),
      sendUnitId: input.sendUnitId || null,
      stockUnitId: input.stockUnitId || null,
      coverageAvailableUnitId: input.coverageAvailableUnitId || null,
      itemCoverageUnitId: input.itemCoverageUnitId || null,
      serviceUnitId: input.serviceUnitId || null,
    },
    include: categoryInclude,
  })

  return normalizeCategoryRow(row)
}

export async function updateCategoryRecord(
  id: string,
  input: CategoryFormInput,
  client: CategoryDbClient = db,
): Promise<void> {
  await client.flooringCategory.update({
    where: { id },
    data: {
      name: input.name.trim(),
      sendUnitId: input.sendUnitId || null,
      stockUnitId: input.stockUnitId || null,
      coverageAvailableUnitId: input.coverageAvailableUnitId || null,
      itemCoverageUnitId: input.itemCoverageUnitId || null,
      serviceUnitId: input.serviceUnitId || null,
    },
  })
}

export async function deleteCategoryRecord(
  id: string,
  client: CategoryDbClient = db,
): Promise<void> {
  await client.flooringCategory.delete({
    where: { id },
  })
}
