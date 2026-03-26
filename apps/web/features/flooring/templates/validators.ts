import { Prisma } from "@builders/db"
import { parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { requireNonNegativeDecimal, requirePositiveDecimal, requireServiceNameWhenCustom } from "@/features/flooring/shared/domain/child-item-validation"

export type TemplateMaterialItemInput = {
  productId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
}

export type TemplateServiceItemInput = {
  serviceId: string | null
  name: string | null
  unitId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
}

export type TemplateSalesRepInput = {
  contactId: string
  percent: Prisma.Decimal
}

export type CreateTemplateInput = {
  propertyId: string
  templateTag: string
  unitType: string | null
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
export type UpdateTemplateSalesRepInput = Partial<TemplateSalesRepInput>

export function validateTemplateMaterialItemInput(body: Record<string, unknown>): TemplateMaterialItemInput {
  const quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  const unitPrice = body.unitPrice === undefined ? null : requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")

  return {
    productId: parseRequiredString(body.productId, "productId"),
    quantity,
    unitPrice,
    notes: parseOptionalString(body.notes),
  }
}

export function validateTemplateServiceItemInput(body: Record<string, unknown>): TemplateServiceItemInput {
  const serviceId = parseOptionalString(body.serviceId)
  const name = parseOptionalString(body.name)
  const quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  const unitPrice = body.unitPrice === undefined ? null : requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")
  requireServiceNameWhenCustom(serviceId, name)

  return {
    serviceId,
    name,
    unitId: parseRequiredString(body.unitId, "unitId"),
    quantity,
    unitPrice,
    notes: parseOptionalString(body.notes),
  }
}

export function validateUpdateTemplateMaterialItemInput(body: Record<string, unknown>): UpdateTemplateMaterialItemInput {
  const input: UpdateTemplateMaterialItemInput = {}

  if ("productId" in body) input.productId = parseRequiredString(body.productId, "productId")
  if ("quantity" in body) input.quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  if ("unitPrice" in body) input.unitPrice = requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")
  if ("notes" in body) input.notes = parseOptionalString(body.notes)

  return input
}

export function validateUpdateTemplateServiceItemInput(body: Record<string, unknown>): UpdateTemplateServiceItemInput {
  const input: UpdateTemplateServiceItemInput = {}

  if ("serviceId" in body) input.serviceId = parseOptionalString(body.serviceId)
  if ("name" in body) input.name = parseOptionalString(body.name)
  if ("unitId" in body) input.unitId = parseRequiredString(body.unitId, "unitId")
  if ("quantity" in body) input.quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  if ("unitPrice" in body) input.unitPrice = requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")
  if ("notes" in body) input.notes = parseOptionalString(body.notes)
  if ("serviceId" in body && input.serviceId === null) {
    requireServiceNameWhenCustom(input.serviceId, input.name ?? null)
  }

  return input
}

function requirePercentInRange(value: Prisma.Decimal, field: string) {
  if (value.lessThan(0) || value.greaterThan(100)) {
    throw { message: `${field} must be between 0 and 100`, field }
  }

  return value
}

export function validateTemplateSalesRepInput(body: Record<string, unknown>): TemplateSalesRepInput {
  return {
    contactId: parseRequiredString(body.contactId, "contactId"),
    percent: requirePercentInRange(parseDecimal(body.percent, "percent", 2), "percent"),
  }
}

export function validateUpdateTemplateSalesRepInput(body: Record<string, unknown>): UpdateTemplateSalesRepInput {
  const input: UpdateTemplateSalesRepInput = {}

  if ("contactId" in body) input.contactId = parseRequiredString(body.contactId, "contactId")
  if ("percent" in body) input.percent = requirePercentInRange(parseDecimal(body.percent, "percent", 2), "percent")

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
    unitType: parseOptionalString(body.unitType),
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
  if ("unitType" in body) input.unitType = parseOptionalString(body.unitType)
  if ("warehouseId" in body) input.warehouseId = parseOptionalString(body.warehouseId)
  if ("instructions" in body) input.instructions = parseOptionalString(body.instructions)
  if ("templateNotes" in body) input.templateNotes = parseOptionalString(body.templateNotes)
  if ("padProductId" in body) input.padProductId = parseOptionalString(body.padProductId)

  return input
}
