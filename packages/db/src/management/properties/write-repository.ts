import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeProperty, type PropertyDetailRecord } from "@builders/domain"

type PropertiesDbClient = PrismaClient | Prisma.TransactionClient

export type CreatePropertyRecordInput = {
  managementCompanyId: string | null
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  instructions?: string | null
}

export type UpdatePropertyRecordInput = Partial<CreatePropertyRecordInput>

const propertyDetailSelect = {
  id: true,
  updatedAt: true,
  name: true,
  streetAddress: true,
  city: true,
  state: true,
  postalCode: true,
  phone: true,
  email: true,
  instructions: true,
  managementCompany: {
    select: { id: true, name: true },
  },
} as const

export async function createPropertyRecord(
  input: CreatePropertyRecordInput,
  client: PropertiesDbClient = db,
): Promise<PropertyDetailRecord> {
  const property = await client.property.create({
    data: input,
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
    data: input,
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
