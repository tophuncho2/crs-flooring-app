import { z } from "zod"
import { InventoryIndicatorExecutionError } from "@builders/application"
import type { ListInput, ListSort } from "@builders/application"
import {
  INVENTORY_INDICATOR_INTERNAL_NOTES_MAX,
  INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE,
  INVENTORY_INDICATOR_SECTION_PAGE_SIZE,
  INVENTORY_INDICATORS_LIST_MAX_PAGE_SIZE,
  INVENTORY_INDICATORS_LIST_PAGE_SIZE,
  type InventoryIndicatorListFilters,
  type InventoryIndicatorsSectionDiff,
} from "@builders/domain"

// Inventory-indicator body + query validators. Shared by the product-scoped child
// routes (`api/products/[id]/indicators/...`) and the standalone list route
// (`api/inventory-indicators`). The parent product id always rides on the route
// path; the body never carries it. Domain form validity (threshold shape) is
// re-checked in the use case — these validators just coerce/bound the wire shape.

function failIndicator(message: string, field?: string): never {
  throw new InventoryIndicatorExecutionError({
    code: "INVENTORY_INDICATOR_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireIndicatorString(value: unknown, field: string): string {
  if (typeof value !== "string") failIndicator(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) failIndicator(`${field} is required`, field)
  return trimmed
}

function optionalThreshold(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") failIndicator(`${field} must be a string`, field)
  return value
}

function optionalNotes(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== "string") failIndicator(`${field} must be a string`, field)
  if (value.length > INVENTORY_INDICATOR_INTERNAL_NOTES_MAX) {
    failIndicator(
      `${field} must be ${INVENTORY_INDICATOR_INTERNAL_NOTES_MAX} characters or fewer`,
      field,
    )
  }
  return value
}

function requireIndicatorObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failIndicator(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

// --- Create (POST /api/products/[id]/indicators) ---

export type ValidatedCreateIndicatorInput = {
  warehouseId: string
  unitId: string
  lowStockThreshold: string
  internalNotes: string
  isActive: boolean
}

export function validateCreateIndicatorInput(
  body: Record<string, unknown>,
): ValidatedCreateIndicatorInput {
  return {
    warehouseId: requireIndicatorString(body.warehouseId, "warehouseId"),
    unitId: requireIndicatorString(body.unitId, "unitId"),
    lowStockThreshold: optionalThreshold(body.lowStockThreshold, "lowStockThreshold") ?? "",
    internalNotes: optionalNotes(body.internalNotes, "internalNotes") ?? "",
    isActive: typeof body.isActive === "boolean" ? body.isActive : true,
  }
}

// --- Section diff (PATCH /api/products/[id]/indicators/section) ---
// The atomic edits + deletes for one product's Indicators section. Mirrors the
// WO material-items diff validator but has NO `added` (create stays the modal —
// the identity triple is create-only). Each modified form carries the full
// editable subset; domain validity (threshold shape) is re-checked in the use
// case, so this just coerces/bounds the wire shape.

function requireIndicatorArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failIndicator(`${path} must be an array`, path)
  return value
}

function validateIndicatorUpdateFormWire(
  value: unknown,
  path: string,
): { lowStockThreshold: string; internalNotes: string; isActive: boolean } {
  const obj = requireIndicatorObject(value, path)
  return {
    lowStockThreshold: optionalThreshold(obj.lowStockThreshold, `${path}.lowStockThreshold`) ?? "",
    internalNotes: optionalNotes(obj.internalNotes, `${path}.internalNotes`) ?? "",
    isActive: typeof obj.isActive === "boolean" ? obj.isActive : true,
  }
}

export function validateIndicatorsSectionDiffInput(
  body: Record<string, unknown>,
): InventoryIndicatorsSectionDiff {
  const modified = requireIndicatorArray(body.modified, "modified").map((entry, idx) => {
    const obj = requireIndicatorObject(entry, `modified[${idx}]`)
    return {
      id: requireIndicatorString(obj.id, `modified[${idx}].id`),
      form: validateIndicatorUpdateFormWire(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireIndicatorArray(body.deleted, "deleted").map((entry, idx) => {
    const obj = requireIndicatorObject(entry, `deleted[${idx}]`)
    return { id: requireIndicatorString(obj.id, `deleted[${idx}].id`) }
  })

  return { modified, deleted }
}

// --- Section page query (GET /api/products/[id]/indicators) ---

const indicatorsPageQuerySchema = z.object({
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_INDICATOR_SECTION_MAX_PAGE_SIZE)
    .default(INVENTORY_INDICATOR_SECTION_PAGE_SIZE),
})

export type ValidatedIndicatorsPageQuery = {
  skip: number
  take: number
}

export function validateIndicatorsPageQuery(
  searchParams: URLSearchParams,
): ValidatedIndicatorsPageQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })
  const parseResult = indicatorsPageQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failIndicator(
      issue?.message ?? "Invalid indicators list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }
  return parseResult.data
}

// --- Standalone list query (GET /api/inventory-indicators) ---

const INDICATORS_MULTI_VALUE_FILTER_KEYS = ["warehouseId", "productId"] as const
type IndicatorsMultiValueFilterKey = (typeof INDICATORS_MULTI_VALUE_FILTER_KEYS)[number]

function readIndicatorsMultiValue(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

/** Sort fields the indicators list API accepts. `productName`/`warehouseName` resolve to the relation. */
export const INDICATORS_UI_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "productName",
  "warehouseName",
] as const

const INDICATORS_MAX_SORT_LEVELS = 3

function parseSortsParam(raw: string | undefined): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(INDICATORS_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= INDICATORS_MAX_SORT_LEVELS) break
  }
  return result
}

const listIndicatorsQuerySchema = z.object({
  indicatorNumber: z.string().optional(),
  sorts: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(INVENTORY_INDICATORS_LIST_MAX_PAGE_SIZE)
    .default(INVENTORY_INDICATORS_LIST_PAGE_SIZE),
})

export function validateIndicatorsListQuery(
  searchParams: URLSearchParams,
): ListInput<InventoryIndicatorListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if ((INDICATORS_MULTI_VALUE_FILTER_KEYS as readonly string[]).includes(key)) return
    raw[key] = value
  })

  const parseResult = listIndicatorsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failIndicator(
      issue?.message ?? "Invalid indicators list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const indicatorNumber = parsed.indicatorNumber?.trim() || undefined

  const multiValueEntries: Array<[IndicatorsMultiValueFilterKey, string[]]> =
    INDICATORS_MULTI_VALUE_FILTER_KEYS.map((key) => [
      key,
      readIndicatorsMultiValue(searchParams, key),
    ])

  const filters: Partial<InventoryIndicatorListFilters> = {}
  for (const [key, values] of multiValueEntries) {
    if (values.length > 0) filters[key] = values
  }
  if (indicatorNumber) filters.indicatorNumber = indicatorNumber

  const hasAnyFilter = Object.keys(filters).length > 0
  const sorts = parseSortsParam(parsed.sorts)

  return {
    filters: hasAnyFilter ? (filters as InventoryIndicatorListFilters) : undefined,
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
