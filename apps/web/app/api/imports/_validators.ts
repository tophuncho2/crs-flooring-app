import { z } from "zod"
import {
  ImportExecutionError,
  LIST_IMPORTS_ALLOWED_GROUP_FIELDS,
  LIST_IMPORTS_MAX_PAGE_SIZE,
  LIST_IMPORTS_PAGE_SIZE,
  StagedInventoryExecutionError,
  type ImportsListFilters,
  type ListInput,
} from "@builders/application"
import type { CreateImportInput, UpdateImportInput } from "@builders/application"
import type {
  StagedInventoryRowDelete,
  StagedInventoryRowDraft,
  StagedInventoryRowUpdate,
  StagedInventoryRowUpdatePatch,
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

export function validateCreateImportInput(body: Record<string, unknown>): CreateImportInput {
  return {
    orderNumber: optionalString(body.orderNumber, "orderNumber"),
    tag: optionalString(body.tag, "tag"),
    notes: optionalString(body.notes, "notes"),
    warehouseId: requireString(body.warehouseId, "warehouseId"),
    manufacturerId: optionalString(body.manufacturerId, "manufacturerId"),
  }
}

export function validateUpdateImportInput(body: Record<string, unknown>): UpdateImportInput {
  const input: UpdateImportInput = {}
  if (body.orderNumber !== undefined) input.orderNumber = optionalString(body.orderNumber, "orderNumber")
  if (body.tag !== undefined) input.tag = optionalString(body.tag, "tag")
  if (body.notes !== undefined) input.notes = optionalString(body.notes, "notes")
  if (body.warehouseId !== undefined) input.warehouseId = requireString(body.warehouseId, "warehouseId")
  if (body.manufacturerId !== undefined) input.manufacturerId = optionalString(body.manufacturerId, "manufacturerId")
  return input
}

// --- Staged inventory rows diff body shaper ---

function failStagedDiff(message: string, field?: string): never {
  throw new StagedInventoryExecutionError({
    code: "STAGED_DIFF_VALIDATION_FAILED",
    message,
    status: 400,
    ...(field ? { field } : {}),
  })
}

function requireStagedString(value: unknown, path: string): string {
  if (typeof value !== "string") failStagedDiff(`${path} must be a string`, path)
  return value as string
}

function nullableStagedString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") failStagedDiff(`${path} must be a string or null`, path)
  return value as string
}

function requireStagedObject(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    failStagedDiff(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

function requireStagedArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failStagedDiff(`${path} must be an array`, path)
  return value as unknown[]
}

function shapeStagedDraft(raw: unknown, idx: number): StagedInventoryRowDraft {
  const row = requireStagedObject(raw, `added[${idx}]`)
  return {
    tempId: requireStagedString(row.tempId, `added[${idx}].tempId`),
    productId: requireStagedString(row.productId, `added[${idx}].productId`),
    itemNumber: requireStagedString(row.itemNumber, `added[${idx}].itemNumber`),
    dyeLot: nullableStagedString(row.dyeLot, `added[${idx}].dyeLot`),
    warehouseId: requireStagedString(row.warehouseId, `added[${idx}].warehouseId`),
    locationId: nullableStagedString(row.locationId, `added[${idx}].locationId`),
    startingStock: requireStagedString(row.startingStock, `added[${idx}].startingStock`),
    cost: nullableStagedString(row.cost, `added[${idx}].cost`),
    freight: nullableStagedString(row.freight, `added[${idx}].freight`),
    notes: nullableStagedString(row.notes, `added[${idx}].notes`),
  }
}

function shapeStagedPatch(raw: unknown, idx: number): StagedInventoryRowUpdatePatch {
  const patch = requireStagedObject(raw, `modified[${idx}].patch`)
  const result: StagedInventoryRowUpdatePatch = {}
  if (patch.productId !== undefined) result.productId = requireStagedString(patch.productId, `modified[${idx}].patch.productId`)
  if (patch.itemNumber !== undefined) result.itemNumber = requireStagedString(patch.itemNumber, `modified[${idx}].patch.itemNumber`)
  if (patch.dyeLot !== undefined) result.dyeLot = nullableStagedString(patch.dyeLot, `modified[${idx}].patch.dyeLot`)
  if (patch.warehouseId !== undefined) result.warehouseId = requireStagedString(patch.warehouseId, `modified[${idx}].patch.warehouseId`)
  if (patch.locationId !== undefined) result.locationId = nullableStagedString(patch.locationId, `modified[${idx}].patch.locationId`)
  if (patch.startingStock !== undefined) result.startingStock = requireStagedString(patch.startingStock, `modified[${idx}].patch.startingStock`)
  if (patch.cost !== undefined) result.cost = nullableStagedString(patch.cost, `modified[${idx}].patch.cost`)
  if (patch.freight !== undefined) result.freight = nullableStagedString(patch.freight, `modified[${idx}].patch.freight`)
  if (patch.notes !== undefined) result.notes = nullableStagedString(patch.notes, `modified[${idx}].patch.notes`)
  return result
}

function shapeStagedUpdate(raw: unknown, idx: number): StagedInventoryRowUpdate {
  const row = requireStagedObject(raw, `modified[${idx}]`)
  return {
    id: requireStagedString(row.id, `modified[${idx}].id`),
    expectedUpdatedAt: requireStagedString(row.expectedUpdatedAt, `modified[${idx}].expectedUpdatedAt`),
    patch: shapeStagedPatch(row.patch, idx),
  }
}

function shapeStagedDelete(raw: unknown, idx: number): StagedInventoryRowDelete {
  const row = requireStagedObject(raw, `deleted[${idx}]`)
  return {
    id: requireStagedString(row.id, `deleted[${idx}].id`),
    expectedUpdatedAt: requireStagedString(row.expectedUpdatedAt, `deleted[${idx}].expectedUpdatedAt`),
  }
}

/**
 * Shapes the raw JSON body into a `StagedInventoryRowsDiff` (domain type).
 *
 * Body-shape validation only — no business rules. The domain's
 * `validateStagedInventoryRowsDiff` (called by `saveStagedInventoryRowsUseCase`)
 * handles warehouse mismatch, unknown product/location, and locked-row guards.
 */
export function validateStagedInventoryRowsDiffBody(body: Record<string, unknown>): StagedInventoryRowsDiff {
  const diffBody = requireStagedObject(body.diff, "diff")
  const added = requireStagedArray(diffBody.added, "diff.added")
  const modified = requireStagedArray(diffBody.modified, "diff.modified")
  const deleted = requireStagedArray(diffBody.deleted, "diff.deleted")
  return {
    added: added.map((entry, idx) => shapeStagedDraft(entry, idx)),
    modified: modified.map((entry, idx) => shapeStagedUpdate(entry, idx)),
    deleted: deleted.map((entry, idx) => shapeStagedDelete(entry, idx)),
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

// --- List query validator (Zod) ---

const listImportsQuerySchema = z.object({
  q: z.string().optional(),
  sort: z.enum(["asc", "desc"]).default("asc"),
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

  return {
    search,
    sort: { field: "importNumber", direction: parsed.sort },
    group: groupField ? { field: groupField } : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
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
