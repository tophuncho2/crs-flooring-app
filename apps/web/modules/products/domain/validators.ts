import type { Prisma } from "@builders/db"
import { createAppError, parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { isBucketFileUrl } from "@/server/storage/s3"

export type CreateProductInput = {
  categoryId: string
  manufacturerId: string | null
  style: string | null
  color: string | null
  width: string | null
  sheetSize: string | null
  thickness: string | null
  unitWeight: string | null
  baseColor: string | null
  coveragePerUnit: Prisma.Decimal | null
  photoUrls: string[]
  notes: string | null
}

export type UpdateProductInput = Partial<CreateProductInput>

function parsePhotoUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .map((item) => {
      if (!isBucketFileUrl(item)) {
        throw createAppError("photoUrls must contain uploaded product photo URLs only", {
          field: "photoUrls",
          status: 400,
        })
      }

      return item
    })
}

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
    baseColor: parseOptionalString(body.baseColor),
    coveragePerUnit: parseCoveragePerUnit(body.coveragePerUnit),
    photoUrls: parsePhotoUrls(body.photoUrls),
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
  if ("baseColor" in body) input.baseColor = parseOptionalString(body.baseColor)
  if ("coveragePerUnit" in body) input.coveragePerUnit = parseCoveragePerUnit(body.coveragePerUnit)
  if ("photoUrls" in body) input.photoUrls = parsePhotoUrls(body.photoUrls)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)

  return input
}
