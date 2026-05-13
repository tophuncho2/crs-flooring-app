import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplate, type TemplateDetail } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateTemplateRecordInput = {
  propertyId: string
  managementCompanyId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  unitType: string
  description?: string | null
  instructions?: string | null
  templateNotes?: string | null
}

export type UpdateTemplateRecordInput = Partial<CreateTemplateRecordInput>

const templateDetailSelect = {
  id: true,
  templateNumber: true,
  unitType: true,
  description: true,
  propertyId: true,
  property: {
    select: {
      name: true,
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      instructions: true,
    },
  },
  managementCompanyId: true,
  managementCompany: { select: { id: true, name: true } },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  warehouseId: true,
  warehouse: { select: { name: true } },
  instructions: true,
  templateNotes: true,
  _count: { select: { items: true } },
  createdAt: true,
  updatedAt: true,
  items: {
    select: {
      id: true,
      productId: true,
      product: { select: { name: true } },
      quantity: true,
      sendUnitName: true,
      sendUnitAbbrev: true,
      notes: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const

export async function createTemplateRecord(
  input: CreateTemplateRecordInput,
  client: TemplatesDbClient = db,
): Promise<TemplateDetail> {
  const template = await client.flooringTemplate.create({
    data: input,
    select: templateDetailSelect,
  })
  return normalizeTemplate(template)
}

export async function updateTemplateRecord(
  id: string,
  input: UpdateTemplateRecordInput,
  client: TemplatesDbClient = db,
): Promise<TemplateDetail> {
  const template = await client.flooringTemplate.update({
    where: { id },
    data: input,
    select: templateDetailSelect,
  })
  return normalizeTemplate(template)
}

export async function deleteTemplateRecordById(
  id: string,
  client: TemplatesDbClient = db,
): Promise<void> {
  await client.flooringTemplate.delete({ where: { id } })
}
