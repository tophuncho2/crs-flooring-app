import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeEntityType, type EntityType, type EntityTypeColor } from "@builders/domain"

type EntityTypesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateEntityTypeRecordInput = {
  type: string
  color: EntityTypeColor
  createdBy: string
  updatedBy: string
}

export type UpdateEntityTypeRecordInput = {
  type?: string
  color?: EntityTypeColor
  updatedBy: string
}

export async function createEntityTypeRecord(
  input: CreateEntityTypeRecordInput,
  client: EntityTypesDbClient = db,
): Promise<EntityType> {
  const entityType = await client.flooringEntityType.create({
    data: {
      type: input.type.trim(),
      color: input.color,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
    },
  })
  return normalizeEntityType(entityType)
}

export async function updateEntityTypeRecord(
  id: string,
  input: UpdateEntityTypeRecordInput,
  client: EntityTypesDbClient = db,
): Promise<EntityType> {
  const data: Prisma.FlooringEntityTypeUpdateInput = { updatedBy: input.updatedBy }
  if (input.type !== undefined) data.type = input.type.trim()
  if (input.color !== undefined) data.color = input.color

  const entityType = await client.flooringEntityType.update({
    where: { id },
    data,
  })
  return normalizeEntityType(entityType)
}

export async function deleteEntityTypeRecordById(
  id: string,
  client: EntityTypesDbClient = db,
): Promise<void> {
  await client.flooringEntityType.delete({ where: { id } })
}
