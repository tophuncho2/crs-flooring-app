import { z } from "zod"
import { ProductExecutionError } from "@builders/application"
import type {
  CreateProductInput,
  ListInput,
  ProductsListFilters,
} from "@builders/application"
import {
  isPaletteColor,
  LIST_PRODUCTS_MAX_PAGE_SIZE,
  LIST_PRODUCTS_PAGE_SIZE,
  PALETTE_COLOR_INVALID_MESSAGE,
  type PaletteColor,
} from "@builders/domain"
import { parseOptionalString } from "@/server/http/api-helpers"

function fail(message: string, field?: string): never {
  throw new ProductExecutionError({
    code: "PRODUCT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

// Coverage per stock unit — mutable reference value on create AND update.
// Carried as a canonical string (mirrors the inventory/imports `startingStock`
// setup), NOT the strict `api-helpers.parseDecimal`: the number cell allows a
// trailing/lone dot mid-typing ("8.", "."), which that strict regex rejects.
// Here we validate leniently with `Number()` (tolerates "8.") and hand the
// trimmed string to Prisma, which coerces it to the Decimal column. The
// 2-decimal cap + non-negativity are already enforced by the cell's
// `sanitizeDecimal`; the `Number()` finiteness + `< 0` checks are defense.
// Blank or a lone "." clears it.
function parseCoveragePerUnit(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  if (trimmed === "" || trimmed === ".") return null
  const numeric = Number(trimmed)
  if (!Number.isFinite(numeric) || numeric < 0) {
    fail("coveragePerUnit must be a non-negative number", "coveragePerUnit")
  }
  return trimmed
}

// Palette color — non-semantic visual tag. Strictly validated when present on
// update (the edit form always carries the current color). Create never accepts
// it: new rows fall to the DB default (SLATE).
function requireColor(value: unknown, field: string): PaletteColor {
  if (!isPaletteColor(value)) {
    fail(PALETTE_COLOR_INVALID_MESSAGE, field)
  }
  return value
}

// Required FK id — trimmed non-empty. Structural guard only; existence is
// checked in the use case (and the DB FK's RESTRICT is the backstop).
function requireId(value: unknown, field: string): string {
  const id = typeof value === "string" ? value.trim() : ""
  if (!id) fail(`${field} is required`, field)
  return id
}

function parseSharedFields(body: Record<string, unknown>) {
  return {
    entityId: parseOptionalString(body.entityId),
    style: parseOptionalString(body.style),
    color: parseOptionalString(body.color),
    coveragePerUnit: parseCoveragePerUnit(body.coveragePerUnit),
    productNamingAddon: parseOptionalString(body.productNamingAddon),
  }
}

/**
 * Route-edge validator for POST /api/products (create flow).
 *
 * Produces the canonical `CreateProductInput` consumed by `createProductUseCase`.
 * Requires `categoryId` + `unitId` (the canonical unit FK). `coverageUnitId` is
 * dormant (UoM epic 2A) — never accepted on the wire.
 *
 * Structural type-guards only. Business rules (category existence, entity
 * existence, name uniqueness, etc.) live in the domain/use-case layers.
 */
export function validateCreateProductInput(body: Record<string, unknown>): CreateProductInput {
  return {
    categoryId: requireId(body.categoryId, "categoryId"),
    unitId: requireId(body.unitId, "unitId"),
    ...parseSharedFields(body),
  }
}

/**
 * Route-edge validator for PATCH /api/products/[id]/primary/section (update flow).
 *
 * `categoryId` is now MUTABLE (UoM epic 2A) — accepted and required, like the
 * create flow (the primary edit form always carries the full draft). `unitId`
 * is required too. `coverageUnitId` is dormant — never accepted.
 */
export function validateUpdateProductInput(
  body: Record<string, unknown>,
): CreateProductInput & { paletteColor?: PaletteColor } {
  return {
    categoryId: requireId(body.categoryId, "categoryId"),
    unitId: requireId(body.unitId, "unitId"),
    ...parseSharedFields(body),
    // Edit-only palette tag — strict when present. Absent on a stale client →
    // left unchanged. Create has no equivalent (defaults to SLATE in the DB).
    ...(body.paletteColor !== undefined
      ? { paletteColor: requireColor(body.paletteColor, "paletteColor") }
      : {}),
  }
}

// --- List query validator ---

const listProductsQuerySchema = z.object({
  q: z.string().optional(),
  prodNumber: z.string().optional(),
  color: z.string().optional(),
  style: z.string().optional(),
  namingAddon: z.string().optional(),
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

  const trimmedProdNumber = parsed.prodNumber?.trim()
  const prodNumber = trimmedProdNumber ? trimmedProdNumber : undefined

  const color = parsed.color?.trim() || undefined
  const style = parsed.style?.trim() || undefined
  const namingAddon = parsed.namingAddon?.trim() || undefined

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
      prodNumber || color || style || namingAddon || categoryId.length > 0
        ? {
            ...(prodNumber ? { prodNumber } : {}),
            ...(color ? { color } : {}),
            ...(style ? { style } : {}),
            ...(namingAddon ? { namingAddon } : {}),
            ...(categoryId.length > 0 ? { categoryId } : {}),
          }
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
