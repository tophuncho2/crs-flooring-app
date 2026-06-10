import { z } from "zod"
import { ProductExecutionError } from "@builders/application"
import type {
  CreateProductInput,
  ListInput,
  ProductsListFilters,
} from "@builders/application"
import type { Prisma } from "@builders/db"
import {
  LIST_PRODUCTS_MAX_PAGE_SIZE,
  LIST_PRODUCTS_PAGE_SIZE,
} from "@builders/domain"
import { parseDecimal, parseOptionalString } from "@/server/http/api-helpers"

function fail(message: string, field?: string): never {
  throw new ProductExecutionError({
    code: "PRODUCT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

// Coverage per stock unit — mutable reference value on create AND update.
// Blank clears it. Reuses the shared `parseDecimal` 2-decimal-max primitive
// (scale = 2); `parseDecimal` permits negatives, so a non-negative guard is
// layered on top.
function parseCoveragePerUnit(value: unknown): Prisma.Decimal | null {
  if (value === "" || value === null || value === undefined) return null
  const decimal = parseDecimal(value, "coveragePerUnit", 2)
  if (decimal.isNegative()) {
    fail("coveragePerUnit must be non-negative", "coveragePerUnit")
  }
  return decimal
}

function parseSharedFields(body: Record<string, unknown>) {
  return {
    manufacturerId: parseOptionalString(body.manufacturerId),
    style: parseOptionalString(body.style),
    color: parseOptionalString(body.color),
    coveragePerUnit: parseCoveragePerUnit(body.coveragePerUnit),
    note: parseOptionalString(body.note),
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
 * `categoryId` is immutable post-create (mirrored at the type level —
 * `ProductUpdateForm` in @builders/domain and `UpdateProductInput` in
 * @builders/db both omit it; `isProductCategoryChangeBlocked` rejects any
 * category change that bypasses the type system). This validator rejects
 * `categoryId` outright so the wire boundary enforces the rule too.
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

// --- List query validator ---

const listProductsQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_PRODUCTS_MAX_PAGE_SIZE)
    .default(LIST_PRODUCTS_PAGE_SIZE),
})

export function validateListProductsQuery(
  searchParams: URLSearchParams,
): ListInput<ProductsListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "categoryId") return
    raw[key] = value
  })

  const parseResult = listProductsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid products list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  const categoryIdRaw = searchParams.getAll("categoryId")
  const categoryId = Array.from(
    new Set(
      categoryIdRaw
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )

  return {
    search,
    filters:
      categoryId.length > 0
        ? { categoryId }
        : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

const productOptionsQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export type ValidatedProductOptionsQuery = {
  search?: string
  categoryId?: string
  skip: number
  take: number
}

export function validateProductOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedProductOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = productOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    fail(
      issue?.message ?? "Invalid product options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.search?.trim()
  const trimmedCategoryId = parsed.categoryId?.trim()
  return {
    search: trimmedSearch ? trimmedSearch : undefined,
    categoryId: trimmedCategoryId ? trimmedCategoryId : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
