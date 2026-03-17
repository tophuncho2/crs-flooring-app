import { Prisma } from "@prisma/client"
import { parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"

export type TemplateMaterialItemInput = {
  productId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
  storedDyeLot: string | null
}

export type TemplateServiceItemInput = {
  serviceId: string | null
  name: string | null
  unitId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
}

export type CreateTemplateInput = {
  propertyId: string
  templateTag: string
  warehouseId: string | null
  instructions: string | null
  templateNotes: string | null
  padProductId: string | null
  items: TemplateMaterialItemInput[]
  serviceItems: TemplateServiceItemInput[]
}

export type UpdateTemplateInput = Partial<Omit<CreateTemplateInput, "items" | "serviceItems">>
export type UpdateTemplateMaterialItemInput = Partial<TemplateMaterialItemInput>
export type UpdateTemplateServiceItemInput = Partial<TemplateServiceItemInput>

export function validateTemplateMaterialItemInput(body: Record<string, unknown>): TemplateMaterialItemInput {
  return {
    productId: parseRequiredString(body.productId, "productId"),
    quantity: parseDecimal(body.quantity, "quantity", 2),
    unitPrice: body.unitPrice === undefined ? null : parseDecimal(body.unitPrice, "unitPrice", 2),
    notes: parseOptionalString(body.notes),
    storedDyeLot: parseOptionalString(body.storedDyeLot),
  }
}

export function validateTemplateServiceItemInput(body: Record<string, unknown>): TemplateServiceItemInput {
  return {
    serviceId: parseOptionalString(body.serviceId),
    name: parseOptionalString(body.name),
    unitId: parseRequiredString(body.unitId, "unitId"),
    quantity: parseDecimal(body.quantity, "quantity", 2),
    unitPrice: body.unitPrice === undefined ? null : parseDecimal(body.unitPrice, "unitPrice", 2),
    notes: parseOptionalString(body.notes),
  }
}

export function validateUpdateTemplateMaterialItemInput(body: Record<string, unknown>): UpdateTemplateMaterialItemInput {
  const input: UpdateTemplateMaterialItemInput = {}

  if ("productId" in body) input.productId = parseRequiredString(body.productId, "productId")
  if ("quantity" in body) input.quantity = parseDecimal(body.quantity, "quantity", 2)
  if ("unitPrice" in body) input.unitPrice = parseDecimal(body.unitPrice, "unitPrice", 2)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)
  if ("storedDyeLot" in body) input.storedDyeLot = parseOptionalString(body.storedDyeLot)

  return input
}

export function validateUpdateTemplateServiceItemInput(body: Record<string, unknown>): UpdateTemplateServiceItemInput {
  const input: UpdateTemplateServiceItemInput = {}

  if ("serviceId" in body) input.serviceId = parseOptionalString(body.serviceId)
  if ("name" in body) input.name = parseOptionalString(body.name)
  if ("unitId" in body) input.unitId = parseRequiredString(body.unitId, "unitId")
  if ("quantity" in body) input.quantity = parseDecimal(body.quantity, "quantity", 2)
  if ("unitPrice" in body) input.unitPrice = parseDecimal(body.unitPrice, "unitPrice", 2)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)

  return input
}

function parseMaterialItems(value: unknown) {
  return Array.isArray(value)
    ? value.map((item, index) => validateTemplateMaterialItemInput(asRecord(item, `items[${index}]`)))
    : []
}

function parseServiceItems(value: unknown) {
  return Array.isArray(value)
    ? value.map((item, index) => validateTemplateServiceItemInput(asRecord(item, `serviceItems[${index}]`)))
    : []
}

function asRecord(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw { message: `${field} must be an object`, field }
  }

  return value as Record<string, unknown>
}

export function validateCreateTemplateInput(body: Record<string, unknown>): CreateTemplateInput {
  return {
    propertyId: parseRequiredString(body.propertyId, "propertyId"),
    templateTag: parseRequiredString(body.templateTag, "templateTag"),
    warehouseId: parseOptionalString(body.warehouseId),
    instructions: parseOptionalString(body.instructions),
    templateNotes: parseOptionalString(body.templateNotes),
    padProductId: parseOptionalString(body.padProductId),
    items: parseMaterialItems(body.items),
    serviceItems: parseServiceItems(body.serviceItems),
  }
}

export function validateUpdateTemplateInput(body: Record<string, unknown>): UpdateTemplateInput {
  const input: UpdateTemplateInput = {}

  if ("propertyId" in body) input.propertyId = parseRequiredString(body.propertyId, "propertyId")
  if ("templateTag" in body) input.templateTag = parseRequiredString(body.templateTag, "templateTag")
  if ("warehouseId" in body) input.warehouseId = parseOptionalString(body.warehouseId)
  if ("instructions" in body) input.instructions = parseOptionalString(body.instructions)
  if ("templateNotes" in body) input.templateNotes = parseOptionalString(body.templateNotes)
  if ("padProductId" in body) input.padProductId = parseOptionalString(body.padProductId)

  return input
}
