import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizeTemplate, type PaletteColor, type TemplateDetail } from "@builders/domain"

type TemplatesDbClient = PrismaClient | Prisma.TransactionClient

export type CreateTemplateRecordInput = {
  propertyId: string | null
  jobTypeId: string | null
  warehouseId: string | null
  unitType: string
  description?: string | null
  internalNotes?: string | null
  installerInstructions?: string | null
  createdBy: string
  updatedBy: string
}

// `createdBy` is immutable post-create; `updatedBy` is always stamped on edit.
// `color` is update-only (the non-semantic palette tag) — never on create
// (`CreateTemplateRecordInput`), so new rows fall to the DB default SLATE.
export type UpdateTemplateRecordInput = Partial<
  Omit<CreateTemplateRecordInput, "createdBy" | "updatedBy">
> & { updatedBy: string; color?: PaletteColor }

const templateDetailSelect = {
  id: true,
  templateNumber: true,
  color: true,
  unitType: true,
  description: true,
  internalNotes: true,
  installerInstructions: true,
  propertyId: true,
  property: {
    select: {
      name: true,
      entity: { select: { id: true, entity: true } },
      streetAddress: true,
      city: true,
      state: true,
      postalCode: true,
      instructions: true,
    },
  },
  jobTypeId: true,
  jobType: { select: { id: true, name: true } },
  warehouseId: true,
  warehouse: { select: { name: true } },
  _count: { select: { items: true } },
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  items: {
    select: {
      id: true,
      productId: true,
      product: { select: { name: true } },
      quantity: true,
      // Item's own unit FK + resolved unit (UoM epic 2C) — create/update return
      // through this select, so it must join `unit` or the returned item's unit
      // comes back blank. Frozen sendUnit* = fallback.
      unitId: true,
      unit: { select: { name: true, abbreviation: true } },
      sendUnitName: true,
      sendUnitAbbrev: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      createdBy: true,
      updatedBy: true,
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
