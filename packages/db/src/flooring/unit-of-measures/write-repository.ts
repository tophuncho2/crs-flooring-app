import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "@prisma/client"
import { normalizeUnitOfMeasureRow, type UnitOfMeasureRecord } from "./read-repository.js"

type UnitOfMeasureDbClient = PrismaClient | Prisma.TransactionClient

export async function createUnitOfMeasureRecord(
  input: { name: string },
  client: UnitOfMeasureDbClient = db,
): Promise<UnitOfMeasureRecord> {
  const row = await client.flooringUnitOfMeasure.create({
    data: {
      name: input.name.trim(),
    },
  })

  return normalizeUnitOfMeasureRow(row)
}

export async function updateUnitOfMeasureRecord(
  id: string,
  input: { name: string },
  client: UnitOfMeasureDbClient = db,
): Promise<void> {
  await client.flooringUnitOfMeasure.update({
    where: { id },
    data: {
      name: input.name.trim(),
    },
  })
}

export async function deleteUnitOfMeasureRecord(
  id: string,
  client: UnitOfMeasureDbClient = db,
): Promise<void> {
  await client.flooringUnitOfMeasure.delete({
    where: { id },
  })
}
