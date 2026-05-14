import { z } from "zod"
import {
  ImportExecutionError,
  StagedInventoryExecutionError,
  StagedInventoryFilterExecutionError,
  type ImportsListFilters,
  type ListInput,
} from "@builders/application"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import {
  IMPORT_INTERNAL_NOTES_MAX,
  IMPORT_PURCHASE_ORDER_NUMBER_MAX,
  LIST_IMPORTS_ALLOWED_GROUP_FIELDS,
  LIST_IMPORTS_MAX_PAGE_SIZE,
  LIST_IMPORTS_PAGE_SIZE,
  STAGED_INVENTORY_ROW_DYE_LOT_MAX,
  STAGED_INVENTORY_ROW_LOCATION_MAX,
  STAGED_INVENTORY_ROW_NOTE_MAX,
  STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX,
} from "@builders/domain"
// no sort param — imports default to importNumber desc, hardcoded server-side
import type {
  StagedInventoryFilterForm,
  StagedInventoryFilterRowDelete,
  StagedInventoryFilterRowDraft,
  StagedInventoryFilterRowUpdate,
  StagedInventoryFiltersDiff,
  StagedInventoryForm,
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

function optionalBoundedString(value: unknown, max: number, field: string): string {
  const str = optionalString(value, field)
  if (str.length > max) {
    throw new ImportExecutionError({
      code: "IMPORT_VALIDATION_FAILED",
      message: `${field} must be ${max} characters or fewer`,
      status: 400,
      field,
    })
  }
  return str
}

export function validateCreateImportInput(body: Record<string, unknown>): CreateImportInput {
  return {
    purchaseOrderNumber: optionalBoundedString(
      body.purchaseOrderNumber,
      IMPORT_PURCHASE_ORDER_NUMBER_MAX,
      "purchaseOrderNumber",
    ),
    internalNotes: optionalBoundedString(body.internalNotes, IMPORT_INTERNAL_NOTES_MAX, "internalNotes"),
    warehouseId: requireString(body.warehouseId, "warehouseId"),
    manufacturerId: optionalString(body.manufacturerId, "manufacturerId"),
  }
}

export function validateUpdateImportInput(body: Record<string, unknown>): UpdateImportInput {
  const input: UpdateImportInput = {}
  if (body.purchaseOrderNumber !== undefined)
    input.purchaseOrderNumber = optionalBoundedString(
      body.purchaseOrderNumber,
      IMPORT_PURCHASE_ORDER_NUMBER_MAX,
      "purchaseOrderNumber",
    )
  if (body.internalNotes !== undefined)
    input.internalNotes = optionalBoundedString(body.internalNotes, IMPORT_INTERNAL_NOTES_MAX, "internalNotes")
  if (body.warehouseId !== undefined) input.warehouseId = requireString(body.warehouseId, "warehouseId")
  if (body.manufacturerId !== undefined) input.manufacturerId = optionalString(body.manufacturerId, "manufacturerId")
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

function optionalStagedBoundedString(value: unknown, max: number, path: string): string {
  const str = optionalStagedString(value, path)
  if (str.length > max) failStaged(`${path} must be ${max} characters or fewer`, path)
  return str
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
    rollNumber: optionalStagedBoundedString(
      form.rollNumber,
      STAGED_INVENTORY_ROW_ROLL_NUMBER_MAX,
      `${path}.rollNumber`,
    ),
    dyeLot: optionalStagedBoundedString(form.dyeLot, STAGED_INVENTORY_ROW_DYE_LOT_MAX, `${path}.dyeLot`),
    location: optionalStagedBoundedString(form.location, STAGED_INVENTORY_ROW_LOCATION_MAX, `${path}.location`),
    startingStock: requireStagedString(form.startingStock, `${path}.startingStock`),
    note: optionalStagedBoundedString(form.note, STAGED_INVENTORY_ROW_NOTE_MAX, `${path}.note`),
  }
}

export type ValidatedCreateStagedInventoryRowBody = {
  filterRowId: string
  form: StagedInventoryForm
}

export function validateCreateStagedInventoryRowBody(
  body: Record<string, unknown>,
): ValidatedCreateStagedInventoryRowBody {
  return {
    filterRowId: requireStagedString(body.filterRowId, "filterRowId"),
    form: shapeStagedForm(body.form, "form"),
  }
}

export type ValidatedUpdateStagedInventoryRowBody = {
  form: StagedInventoryForm
}

export function validateUpdateStagedInventoryRowBody(
  body: Record<string, unknown>,
): ValidatedUpdateStagedInventoryRowBody {
  return {
    form: shapeStagedForm(body.form, "form"),
  }
}

export function validateDeleteStagedInventoryRowBody(
  _body: Record<string, unknown>,
): Record<string, never> {
  // Body-shape only — expectedUpdatedAt travels via the mutation envelope.
  return {}
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
  if (raw.length === 0) failMarkForImport("stagedRowIds must not be empty", "stagedRowIds")
  const stagedRowIds = raw.map((value, idx) => {
    if (typeof value !== "string" || value.trim() === "") {
      failMarkForImport(`stagedRowIds[${idx}] must be a non-empty string`, `stagedRowIds[${idx}]`)
    }
    return value as string
  })
  return { stagedRowIds }
}

// --- Filter-rows diff body shaper ---

function failFilter(message: string, field?: string): never {
  throw new StagedInventoryFilterExecutionError({
    code: "FILTER_VALIDATION_FAILED",
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
    stockOrdered: requireFilterString(form.stockOrdered, `${path}.stockOrdered`),
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

/**
 * Shapes the raw JSON body into a `StagedInventoryFiltersDiff` (domain
 * type). Body-shape validation only — domain rules (duplicate product,
 * locked-with-children, delete-blocked, unknown product) are evaluated
 * by `validateStagedInventoryFiltersDiff` inside
 * `saveStagedInventoryFiltersSectionUseCase`.
 *
 * Mirrors the WOMI material-items diff body shape: top-level
 * added/modified/deleted, no `diff` wrapper.
 */
export function validateStagedInventoryFiltersDiffBody(
  body: Record<string, unknown>,
): StagedInventoryFiltersDiff {
  const added = requireFilterArray(body.added, "added").map((entry, idx) => shapeFilterDraft(entry, idx))
  const modified = requireFilterArray(body.modified, "modified").map((entry, idx) => shapeFilterUpdate(entry, idx))
  const deleted = requireFilterArray(body.deleted, "deleted").map((entry, idx) => shapeFilterDelete(entry, idx))
  return { added, modified, deleted }
}

// --- List query validator (Zod) ---

const listImportsQuerySchema = z.object({
  q: z.string().optional(),
  grouped: z.enum(["0", "1"]).optional(),
  groups: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_IMPORTS_MAX_PAGE_SIZE)
    .default(LIST_IMPORTS_PAGE_SIZE),
})

const ALLOWED_GROUP_SET = new Set<string>(LIST_IMPORTS_ALLOWED_GROUP_FIELDS)

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

  const firstGroupKey =
    parsed.grouped === "1"
      ? parsed.groups
          ?.split(",")
          .map((part) => part.trim())
          .filter(Boolean)[0]
      : undefined
  const groupField = firstGroupKey && ALLOWED_GROUP_SET.has(firstGroupKey) ? firstGroupKey : undefined

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
    filters: warehouseId.length > 0 ? { warehouseId } : undefined,
    group: groupField ? { field: groupField } : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
