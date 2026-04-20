import { ProductExecutionError } from "@builders/application"
import type { CreateProductInput } from "@builders/application"
import { parseDecimal, parseOptionalString } from "@/server/http/api-helpers"

function parseCoveragePerUnit(value: unknown) {
  if (value === "" || value === null || value === undefined) return null
  return parseDecimal(value, "coveragePerUnit", 4)
}

/**
 * Route-edge validator for POST /api/products and PATCH /api/products/[id]/primary/section.
 *
 * Produces the canonical `CreateProductInput` consumed by the application layer.
 * `updateProductUseCase` accepts `Partial<CreateProductInput>`, so passing this
 * full shape is safe for PATCH (replace-primary-section semantics).
 *
 * Structural type-guards only. Business rules (category existence, manufacturer
 * existence, name uniqueness, etc.) live in the domain/use-case layers.
 */
export function validateProductInput(body: Record<string, unknown>): CreateProductInput {
  const categoryId = typeof body.categoryId === "string" ? body.categoryId.trim() : ""
  if (!categoryId) {
    throw new ProductExecutionError({
      code: "PRODUCT_VALIDATION_FAILED",
      message: "categoryId is required",
      status: 400,
      field: "categoryId",
    })
  }

  return {
    categoryId,
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
