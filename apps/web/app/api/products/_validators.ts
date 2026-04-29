import { ProductExecutionError } from "@builders/application"
import type { CreateProductInput } from "@builders/application"
import { parseDecimal, parseOptionalString } from "@/server/http/api-helpers"

function parseCoveragePerUnit(value: unknown) {
  if (value === "" || value === null || value === undefined) return null
  return parseDecimal(value, "coveragePerUnit", 4)
}

function parseSharedFields(body: Record<string, unknown>) {
  return {
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

/**
 * Route-edge validator for POST /api/products (create flow).
 *
 * Produces the canonical `CreateProductInput` consumed by `createProductUseCase`.
 * Requires `categoryId` — category is the source of the unit-of-measure
 * snapshots stamped onto the product row.
 *
 * Structural type-guards only. Business rules (category existence, manufacturer
 * existence, name uniqueness, etc.) live in the domain/use-case layers.
 */
export function validateCreateProductInput(body: Record<string, unknown>): CreateProductInput {
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
    ...parseSharedFields(body),
  }
}

/**
 * Route-edge validator for PATCH /api/products/[id]/primary/section (update flow).
 *
 * Category is immutable post-create (mirrored at the type level — `ProductUpdateForm`
 * in @builders/domain and `UpdateProductInput` in @builders/db both omit it,
 * and `isProductCategoryChangeBlocked` in @builders/domain rejects any attempt
 * that bypasses the type system). This validator rejects `categoryId` in the
 * PATCH body with 400 so the wire boundary enforces the rule too.
 */
export function validateUpdateProductInput(
  body: Record<string, unknown>,
): Omit<CreateProductInput, "categoryId"> {
  if (body.categoryId !== undefined) {
    throw new ProductExecutionError({
      code: "PRODUCT_CATEGORY_LOCKED",
      message: "Category cannot change after a product is created.",
      status: 400,
      field: "categoryId",
    })
  }

  return parseSharedFields(body)
}
