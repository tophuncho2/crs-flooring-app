import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeEntity, normalizePhoneNumber, type EntityDetail } from "@builders/domain"
import { entityTypesSelect } from "./read-repository.js"

type EntitiesDbClient = PrismaClient | Prisma.TransactionClient

// Phone standard: persist the canonical digits-only form (defensive guard — the
// API validator already normalized, but the data layer is the last gate).
// `undefined` is preserved so a partial update never clears the column.
function normalizeNullablePhone(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return normalizePhoneNumber(value) || null
}

export type CreateEntityRecordInput = {
  entity: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  /** Entity-type ids to link. Omit (undefined) to link none on create. */
  typeIds?: string[]
  createdBy: string
  updatedBy: string
}

// createdBy is immutable post-create; updatedBy is always stamped on edit.
export type UpdateEntityRecordInput = Partial<
  Omit<CreateEntityRecordInput, "createdBy" | "updatedBy">
> & { updatedBy: string }

const entityDetailSelect = {
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  entity: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  _count: {
    select: { properties: true },
  },
  entityTypes: entityTypesSelect,
} as const satisfies Prisma.EntitySelect

export async function createEntityRecord(
  input: CreateEntityRecordInput,
  client: EntitiesDbClient = db,
): Promise<EntityDetail> {
  const { typeIds, ...fields } = input
  const entity = await client.entity.create({
    data: {
      ...fields,
      phone: normalizeNullablePhone(fields.phone),
      ...(typeIds
        ? { entityTypes: { create: typeIds.map((entityTypeId) => ({ entityTypeId })) } }
        : {}),
    },
    select: entityDetailSelect,
  })

  return normalizeEntity(entity)
}

export async function updateEntityRecord(
  id: string,
  input: UpdateEntityRecordInput,
  client: EntitiesDbClient = db,
): Promise<EntityDetail> {
  const { typeIds, ...fields } = input
  const entity = await client.entity.update({
    where: { id },
    data: {
      ...fields,
      phone: normalizeNullablePhone(fields.phone),
      // Replace the link set wholesale when typeIds is provided (set semantics).
      // deleteMany + create run inside Prisma's implicit per-call transaction.
      ...(typeIds
        ? {
            entityTypes: {
              deleteMany: {},
              create: typeIds.map((entityTypeId) => ({ entityTypeId })),
            },
          }
        : {}),
    },
    select: entityDetailSelect,
  })

  return normalizeEntity(entity)
}

export async function deleteEntityRecordById(
  id: string,
  client: EntitiesDbClient = db,
): Promise<void> {
  await client.entity.delete({ where: { id } })
}
