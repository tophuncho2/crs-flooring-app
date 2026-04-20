import type { Prisma } from "@builders/db"
import { parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"

export type CreateProductInput = {
  categoryId: string
  manufacturerId: string | null
  style: string | null
  color: string | null
  width: string | null
  sheetSize: string | null
  thickness: string | null
  unitWeight: string | null
  coveragePerUnit: Prisma.Decimal | null
  notes: string | null
}

export type UpdateProductInput = Partial<CreateProductInput>

function parseCoveragePerUnit(value: unknown) {
  return value === "" || value === null || value === undefined ? null : parseDecimal(value, "coveragePerUnit", 4)
}

export function validateCreateProductInput(body: Record<string, unknown>): CreateProductInput {
  return {
    categoryId: parseRequiredString(body.categoryId, "categoryId"),
    manufacturerId: parseOptionalString(body.manufacturerId),
    style: parseOptionalString(body.style),
    color: parseOptionalString(body.color),
    width: parseOptionalString(body.width),
    sheetSize: parseOptionalString(body.sheetSize),
    thickness: parseOptionalString(body.thickness),
    unitWeight: parseOptionalString(body.unitWeight),
    coveragePerUnit: parseCoveragePerUnit(body.coveragePerUnit),
    notes: parseOptionalString(body.notes),
  }
}

export function validateUpdateProductInput(body: Record<string, unknown>): UpdateProductInput {
  const input: UpdateProductInput = {}

  if ("categoryId" in body) input.categoryId = parseRequiredString(body.categoryId, "categoryId")
  if ("manufacturerId" in body) input.manufacturerId = parseOptionalString(body.manufacturerId)
  if ("style" in body) input.style = parseOptionalString(body.style)
  if ("color" in body) input.color = parseOptionalString(body.color)
  if ("width" in body) input.width = parseOptionalString(body.width)
  if ("sheetSize" in body) input.sheetSize = parseOptionalString(body.sheetSize)
  if ("thickness" in body) input.thickness = parseOptionalString(body.thickness)
  if ("unitWeight" in body) input.unitWeight = parseOptionalString(body.unitWeight)
  if ("coveragePerUnit" in body) input.coveragePerUnit = parseCoveragePerUnit(body.coveragePerUnit)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)

  return input
}
