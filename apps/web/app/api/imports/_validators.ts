import { z } from "zod"
import {
  ImportExecutionError,
  ImportStagedInventorySectionExecutionError,
  StagedInventoryExecutionError,
  type ImportsListFilters,
  type ListInput,
} from "@builders/application"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import {
  IMPORT_OPTIONS_DEFAULT_TAKE,
  IMPORT_OPTIONS_MAX_TAKE,
  LIST_IMPORTS_MAX_PAGE_SIZE,
  LIST_IMPORTS_PAGE_SIZE,
  MAX_MARK_FOR_IMPORT_ROWS,
  PALETTE_COLOR_INVALID_MESSAGE,
  isPaletteColor,
  type PaletteColor,
} from "@builders/domain"
// no sort param — imports default to createdAt desc, hardcoded server-side
import type {
  ImportStagedInventorySectionDiff,
  StagedInventoryFilterForm,
  StagedInventoryFilterRowDelete,
  StagedInventoryFilterRowDraft,
  StagedInventoryFilterRowUpdate,
  StagedInventoryFiltersDiff,
  StagedInventoryForm,
  StagedInventoryRowDelete,
  StagedInventoryRowDraft,
  StagedInventoryRowUpdate,
  StagedInventoryRowsDiff,
} from "@builders/domain"

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

function optionalString(value: unknown, field: string): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") {
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: `${field} must be a string`,
      status: 400,
      field,
    })
  }
  return value
}

// Palette tag is strict-when-present on update: a supplied value must be a real
// PaletteColor, else 400 with the shared message. Edit-only — create never
// accepts color (new rows fall to the DB default SLATE).
function requireColor(value: unknown): PaletteColor {
  if (!isPaletteColor(value)) {
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: PALETTE_COLOR_INVALID_MESSAGE,
      status: 400,
      field: "color",
    })
  }
  return value
}

export function validateCreateImportInput(body: Record<string, unknown>): CreateImportInput {
  return {
    purchaseOrderNumber: optionalString(body.purchaseOrderNumber, "purchaseOrderNumber"),
    internalNotes: optionalString(body.internalNotes, "internalNotes"),
    warehouseId: requireString(body.warehouseId, "warehouseId"),
    entityId: optionalString(body.entityId, "entityId"),
  }
}

export function validateUpdateImportInput(body: Record<string, unknown>): UpdateImportInput {
  const input: UpdateImportInput = {}
  if (body.purchaseOrderNumber !== undefined)
    input.purchaseOrderNumber = optionalString(body.purchaseOrderNumber, "purchaseOrderNumber")
  if (body.internalNotes !== undefined)
    input.internalNotes = optionalString(body.internalNotes, "internalNotes")
  if (body.warehouseId !== undefined) input.warehouseId = requireString(body.warehouseId, "warehouseId")
  if (body.entityId !== undefined) input.entityId = optionalString(body.entityId, "entityId")
  if ("color" in body) input.color = requireColor(body.color)
  return input
}

// --- Staged inventory rows body shapers ---

function failStaged(message: string, field?: string): never {
  throw new StagedInventoryExecutionError({
    code: "STAGED_VALIDATION_FAILED",
    message,
    status: 400,
    ...(field ? { field } : {}),
  })
}

function requireStagedString(value: unknown, path: string): string {
  if (typeof value !== "string") failStaged(`${path} must be a string`, path)
  return value as string
}

function optionalStagedString(value: unknown, path: string): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") failStaged(`${path} must be a string`, path)
  return value as string
}

function requireStagedObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failStaged(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

function requireStagedArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failStaged(`${path} must be an array`, path)
  return value as unknown[]
}

function shapeStagedForm(raw: unknown, path: string): StagedInventoryForm {
  const form = requireStagedObject(raw, path)
  return {
    rollNumber: optionalStagedString(form.rollNumber, `${path}.rollNumber`),
    dyeLot: optionalStagedString(form.dyeLot, `${path}.dyeLot`),
    location: optionalStagedString(form.location, `${path}.location`),
    startingStock: requireStagedString(form.startingStock, `${path}.startingStock`),
    cost: optionalStagedString(form.cost, `${path}.cost`),
    freight: optionalStagedString(form.freight, `${path}.freight`),
    note: optionalStagedString(form.note, `${path}.note`),
  }
}

// --- Mark-for-import body shaper ---

function failMarkForImport(message: string, field?: string): never {
  throw new StagedInventoryExecutionError({
    code: "STAGED_VALIDATION_FAILED",
    message,
    status: 400,
    ...(field ? { field } : {}),
  })
}

export function validateMarkForImportBody(body: Record<string, unknown>): { stagedRowIds: string[] } {
  const raw = body.stagedRowIds
  if (!Array.isArray(raw)) failMarkForImport("stagedRowIds must be an array", "stagedRowIds")
  if (raw.length > MAX_MARK_FOR_IMPORT_ROWS) {
    failMarkForImport(
      `Too many rows selected (${raw.length}). A single import is limited to ${MAX_MARK_FOR_IMPORT_ROWS} rows — split the selection into smaller batches.`,
      "stagedRowIds",
    )
  }
  const stagedRowIds = raw.map((value, idx) => {
    if (typeof value !== "string") {
      failMarkForImport(`stagedRowIds[${idx}] must be a string`, `stagedRowIds[${idx}]`)
    }
    return value as string
  })
  return { stagedRowIds }
}

// --- Filter-rows diff body shaper ---

function failFilter(message: string, field?: string): never {
  throw new ImportStagedInventorySectionExecutionError({
    code: "SECTION_FILTER_VALIDATION_FAILED",
    message,
    status: 400,
    ...(field ? { field } : {}),
  })
}

function requireFilterString(value: unknown, path: string): string {
  if (typeof value !== "string") failFilter(`${path} must be a string`, path)
  return value as string
}

function nullableFilterString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") failFilter(`${path} must be a string or null`, path)
  return value as string
}

function requireFilterObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failFilter(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

function requireFilterArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failFilter(`${path} must be an array`, path)
  return value as unknown[]
}

function shapeFilterForm(raw: unknown, path: string): StagedInventoryFilterForm {
  const form = requireFilterObject(raw, path)
  return {
    categoryFilterId: nullableFilterString(form.categoryFilterId, `${path}.categoryFilterId`),
    productId: requireFilterString(form.productId, `${path}.productId`),
    // Stock ordered is optional — accept missing/blank; "" carries "unset"
    // through the domain form type (which is a plain string).
    stockOrdered: nullableFilterString(form.stockOrdered, `${path}.stockOrdered`) ?? "",
  }
}

function shapeFilterDraft(raw: unknown, idx: number): StagedInventoryFilterRowDraft {
  const row = requireFilterObject(raw, `added[${idx}]`)
  return {
    tempId: requireFilterString(row.tempId, `added[${idx}].tempId`),
    form: shapeFilterForm(row.form, `added[${idx}].form`),
  }
}

function shapeFilterUpdate(raw: unknown, idx: number): StagedInventoryFilterRowUpdate {
  const row = requireFilterObject(raw, `modified[${idx}]`)
  return {
    id: requireFilterString(row.id, `modified[${idx}].id`),
    form: shapeFilterForm(row.form, `modified[${idx}].form`),
  }
}

function shapeFilterDelete(raw: unknown, idx: number): StagedInventoryFilterRowDelete {
  const row = requireFilterObject(raw, `deleted[${idx}]`)
  return {
    id: requireFilterString(row.id, `deleted[${idx}].id`),
  }
}

function shapeFiltersSlice(
  raw: unknown,
  pathPrefix: string,
): StagedInventoryFiltersDiff {
  const slice = requireFilterObject(raw, pathPrefix)
  const added = requireFilterArray(slice.added, `${pathPrefix}.added`).map(
    (entry, idx) => shapeFilterDraft(entry, idx),
  )
  const modified = requireFilterArray(slice.modified, `${pathPrefix}.modified`).map(
    (entry, idx) => shapeFilterUpdate(entry, idx),
  )
  const deleted = requireFilterArray(slice.deleted, `${pathPrefix}.deleted`).map(
    (entry, idx) => shapeFilterDelete(entry, idx),
  )
  return { added, modified, deleted }
}

function shapeStagedRowDraft(raw: unknown, idx: number): StagedInventoryRowDraft {
  const row = requireStagedObject(raw, `rows.added[${idx}]`)
  return {
    tempId: requireStagedString(row.tempId, `rows.added[${idx}].tempId`),
    productId: requireStagedString(row.productId, `rows.added[${idx}].productId`),
    form: shapeStagedForm(row.form, `rows.added[${idx}].form`),
  }
}

function shapeStagedRowUpdate(raw: unknown, idx: number): StagedInventoryRowUpdate {
  const row = requireStagedObject(raw, `rows.modified[${idx}]`)
  return {
    id: requireStagedString(row.id, `rows.modified[${idx}].id`),
    form: shapeStagedForm(row.form, `rows.modified[${idx}].form`),
  }
}

function shapeStagedRowDelete(raw: unknown, idx: number): StagedInventoryRowDelete {
  const row = requireStagedObject(raw, `rows.deleted[${idx}]`)
  return {
    id: requireStagedString(row.id, `rows.deleted[${idx}].id`),
  }
}

function shapeRowsSlice(raw: unknown): StagedInventoryRowsDiff {
  const slice = requireStagedObject(raw, "rows")
  const added = requireStagedArray(slice.added, "rows.added").map((entry, idx) =>
    shapeStagedRowDraft(entry, idx),
  )
  const modified = requireStagedArray(slice.modified, "rows.modified").map((entry, idx) =>
    shapeStagedRowUpdate(entry, idx),
  )
  const deleted = requireStagedArray(slice.deleted, "rows.deleted").map((entry, idx) =>
    shapeStagedRowDelete(entry, idx),
  )
  return { added, modified, deleted }
}

/**
 * Shapes the raw JSON body into an `ImportStagedInventorySectionDiff`
 * (domain type) — the combined filter-rows + staged-rows section diff
 * that backs `PATCH /api/imports/[id]/staged-inventory/section`.
 *
 * Body-shape validation only — domain rules (duplicate product,
 * category-filter-locked-after-create, unknown product, non-DRAFT
 * edits, etc.) are evaluated by `validateStagedInventoryFiltersDiff` +
 * `validateStagedInventoryRowsDiff` inside
 * `saveImportStagedInventorySectionUseCase`.
 */
export function validateImportStagedInventorySectionDiffBody(
  body: Record<string, unknown>,
): ImportStagedInventorySectionDiff {
  return {
    filters: shapeFiltersSlice(body.filters, "filters"),
    rows: shapeRowsSlice(body.rows),
  }
}

// --- List query validator (Zod) ---

const listImportsQuerySchema = z.object({
  q: z.string().optional(),
  impNumber: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_IMPORTS_MAX_PAGE_SIZE)
    .default(LIST_IMPORTS_PAGE_SIZE),
})

export function validateListImportsQuery(searchParams: URLSearchParams): ListInput<ImportsListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if (key === "warehouseId") return
    raw[key] = value
  })

  const parseResult = listImportsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid imports list query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined
  const impNumber = parsed.impNumber?.trim() || undefined

  const warehouseIdRaw = searchParams.getAll("warehouseId")
  const warehouseId = Array.from(
    new Set(
      warehouseIdRaw
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )

  return {
    search,
    filters:
      impNumber || warehouseId.length > 0
        ? {
            ...(impNumber ? { impNumber } : {}),
            ...(warehouseId.length > 0 ? { warehouseId } : {}),
          }
        : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options (picker) query validator ---

const importOptionsQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(IMPORT_OPTIONS_MAX_TAKE)
    .default(IMPORT_OPTIONS_DEFAULT_TAKE),
})

export type ValidatedImportOptionsQuery = {
  warehouseId: string
  search?: string
  skip: number
  take: number
}

export function validateImportOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedImportOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = importOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid import options query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimmed = parsed.search?.trim()
  return {
    warehouseId: parsed.warehouseId.trim(),
    ...(trimmed ? { search: trimmed } : {}),
    skip: parsed.skip,
    take: parsed.take,
  }
}
