import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeProperty,
  normalizePhoneNumber,
  type PaletteColor,
  type PropertyDetailRecord,
} from "@builders/domain"

type PropertiesDbClient = PrismaClient | Prisma.TransactionClient

// Phone standard: persist the canonical digits-only form (defensive guard — the
// API validator already normalized, but the data layer is the last gate).
// `undefined` is preserved so a partial update never clears the column.
function normalizeNullablePhone(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return normalizePhoneNumber(value) || null
}

export type CreatePropertyRecordInput = {
  entityId: string | null
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  instructions?: string | null
  // Edit-only: the create path never sets color, so new rows fall to the DB
  // default (SLATE). Optional here so `UpdatePropertyRecordInput` inherits it.
  color?: PaletteColor
  createdBy: string
  updatedBy: string
}

// `createdBy` is immutable post-create; `updatedBy` is always stamped on edit.
export type UpdatePropertyRecordInput = Partial<
  Omit<CreatePropertyRecordInput, "createdBy" | "updatedBy">
> & { updatedBy: string }

const propertyDetailSelect = {
  id: true,
  propertyNumber: true,
  createdAt: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  instructions: true,
  color: true,
  createdBy: true,
  updatedBy: true,
  entity: {
    select: { id: true, entity: true },
  },
} as const

export async function createPropertyRecord(
  input: CreatePropertyRecordInput,
  client: PropertiesDbClient = db,
): Promise<PropertyDetailRecord> {
  const property = await client.property.create({
    data: { ...input, phone: normalizeNullablePhone(input.phone) },
    select: propertyDetailSelect,
  })

  return normalizeProperty(property)
}

export async function updatePropertyRecord(
  id: string,
  input: UpdatePropertyRecordInput,
  client: PropertiesDbClient = db,
): Promise<PropertyDetailRecord> {
  const property = await client.property.update({
    where: { id },
    data: { ...input, phone: normalizeNullablePhone(input.phone) },
    select: propertyDetailSelect,
  })

  return normalizeProperty(property)
}

export async function deletePropertyRecordById(
  id: string,
  client: PropertiesDbClient = db,
): Promise<void> {
  await client.property.delete({ where: { id } })
}
