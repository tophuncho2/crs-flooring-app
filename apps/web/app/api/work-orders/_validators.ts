import { z } from "zod"
import {
  WorkOrderExecutionError,
  WorkOrderMaterialItemExecutionError,
} from "@builders/application"
import type {
  CreateWorkOrderUseCaseInput,
  ListInput,
  SyncTemplateToWorkOrderInput,
  UpdateWorkOrderUseCaseInput,
  WorkOrdersListFilters,
} from "@builders/application"
import {
  WO_CUSTOM_ADDRESS_MAX,
  WO_DESCRIPTION_MAX,
  WO_INSTALLER_INSTRUCTIONS_MAX,
  WO_INTERNAL_NOTES_MAX,
  WO_UNIT_NUMBER_MAX,
  WO_UNIT_TYPE_MAX,
  WORK_ORDER_MATERIAL_ITEM_NOTES_MAX,
  type WorkOrderMaterialItemCreateForm,
  type WorkOrderMaterialItemUpdateForm,
  type WorkOrderMaterialItemsDiff,
} from "@builders/domain"

function failWorkOrder(message: string, field?: string): never {
  throw new WorkOrderExecutionError({
    code: "WORK_ORDER_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function failMaterialItem(message: string, field?: string): never {
  throw new WorkOrderMaterialItemExecutionError({
    code: "WORK_ORDER_MATERIAL_ITEM_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireString(value: unknown, field: string, fail: (m: string, f?: string) => never): string {
  if (typeof value !== "string") fail(`${field} is required`, field)
  const trimmed = (value as string).trim()
  if (!trimmed) fail(`${field} is required`, field)
  return trimmed
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Quantity is optional on a material item — a missing/blank value is carried
// as an empty string ("unset") and persisted as NULL downstream. A provided
// value is validated (> 0) by the domain rule, not here.
function optionalQuantity(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function optionalBoundedText(
  value: unknown,
  max: number,
  field: string,
  fail: (m: string, f?: string) => never,
): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  if (value.length > max) fail(`${field} must be ${max} characters or fewer`, field)
  return value
}

function optionalVacancy(value: unknown): "VACANT" | "OCCUPIED" | null {
  if (value === undefined || value === null) return null
  if (value === "VACANT" || value === "OCCUPIED") return value
  if (value === "") return null
  return null
}

function optionalTimeOfDay(value: unknown): "AM" | "PM" | null {
  if (value === undefined || value === null) return null
  if (value === "AM" || value === "PM") return value
  if (value === "") return null
  return null
}

function optionalDate(value: unknown, field: string): Date | null {
  if (value === undefined || value === null || value === "") return null
  if (typeof value !== "string") {
    failWorkOrder(`${field} must be an ISO date string`, field)
  }
  const parsed = new Date(value as string)
  if (Number.isNaN(parsed.getTime())) {
    failWorkOrder(`${field} must be a valid ISO date`, field)
  }
  return parsed
}

export function validateCreateWorkOrderInput(
  body: Record<string, unknown>,
): CreateWorkOrderUseCaseInput {
  return {
    propertyId: requireString(body.propertyId, "propertyId", failWorkOrder),
    // Warehouse is optional — a work order may be created without one.
    warehouseId: optionalString(body.warehouseId),
    templateId: optionalString(body.templateId),
    managementCompanyId: optionalString(body.managementCompanyId),
    jobTypeId: optionalString(body.jobTypeId),
    statusId: optionalString(body.statusId),
    unitNumber: optionalBoundedText(body.unitNumber, WO_UNIT_NUMBER_MAX, "unitNumber", failWorkOrder),
    unitType: optionalBoundedText(body.unitType, WO_UNIT_TYPE_MAX, "unitType", failWorkOrder),
    customAddress: optionalBoundedText(body.customAddress, WO_CUSTOM_ADDRESS_MAX, "customAddress", failWorkOrder),
    description: optionalBoundedText(body.description, WO_DESCRIPTION_MAX, "description", failWorkOrder),
    internalNotes: optionalBoundedText(body.internalNotes, WO_INTERNAL_NOTES_MAX, "internalNotes", failWorkOrder),
    installerInstructions: optionalBoundedText(
      body.installerInstructions,
      WO_INSTALLER_INSTRUCTIONS_MAX,
      "installerInstructions",
      failWorkOrder,
    ),
    scheduledFor: optionalDate(body.scheduledFor, "scheduledFor"),
    vacancy: optionalVacancy(body.vacancy),
    timeOfDay: optionalTimeOfDay(body.timeOfDay),
  }
}

export function validateUpdateWorkOrderInput(
  body: Record<string, unknown>,
): UpdateWorkOrderUseCaseInput {
  const input: UpdateWorkOrderUseCaseInput = {}

  if ("propertyId" in body) {
    input.propertyId = requireString(body.propertyId, "propertyId", failWorkOrder)
  }
  if ("warehouseId" in body) {
    // Warehouse is optional and may be cleared (null).
    input.warehouseId = optionalString(body.warehouseId)
  }
  if ("templateId" in body) input.templateId = optionalString(body.templateId)
  if ("managementCompanyId" in body) input.managementCompanyId = optionalString(body.managementCompanyId)
  if ("jobTypeId" in body) input.jobTypeId = optionalString(body.jobTypeId)
  if ("statusId" in body) input.statusId = optionalString(body.statusId)
  if ("unitNumber" in body) input.unitNumber = optionalBoundedText(body.unitNumber, WO_UNIT_NUMBER_MAX, "unitNumber", failWorkOrder)
  if ("unitType" in body) input.unitType = optionalBoundedText(body.unitType, WO_UNIT_TYPE_MAX, "unitType", failWorkOrder)
  if ("customAddress" in body) input.customAddress = optionalBoundedText(body.customAddress, WO_CUSTOM_ADDRESS_MAX, "customAddress", failWorkOrder)
  if ("description" in body) input.description = optionalBoundedText(body.description, WO_DESCRIPTION_MAX, "description", failWorkOrder)
  if ("internalNotes" in body) {
    input.internalNotes = optionalBoundedText(body.internalNotes, WO_INTERNAL_NOTES_MAX, "internalNotes", failWorkOrder)
  }
  if ("installerInstructions" in body) {
    input.installerInstructions = optionalBoundedText(
      body.installerInstructions,
      WO_INSTALLER_INSTRUCTIONS_MAX,
      "installerInstructions",
      failWorkOrder,
    )
  }
  if ("scheduledFor" in body) input.scheduledFor = optionalDate(body.scheduledFor, "scheduledFor")
  if ("vacancy" in body) input.vacancy = optionalVacancy(body.vacancy)
  if ("timeOfDay" in body) input.timeOfDay = optionalTimeOfDay(body.timeOfDay)

  return input
}

function requireArray(value: unknown, path: string, fail: (m: string, f?: string) => never): unknown[] {
  if (!Array.isArray(value)) fail(`${path} must be an array`, path)
  return value
}

function requireObject(value: unknown, path: string, fail: (m: string, f?: string) => never): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Material items diff
// ---------------------------------------------------------------------------

function validateMaterialItemCreateForm(
  value: unknown,
  path: string,
): WorkOrderMaterialItemCreateForm {
  const obj = requireObject(value, path, failMaterialItem)
  return {
    productId: requireString(obj.productId, `${path}.productId`, failMaterialItem),
    quantity: optionalQuantity(obj.quantity),
    notes: optionalBoundedText(obj.notes, WORK_ORDER_MATERIAL_ITEM_NOTES_MAX, `${path}.notes`, failMaterialItem) ?? "",
  }
}

// Update form carries `productId` — the product is editable until the item
// has linked adjustments. The "locked once it has adjustments" rule is enforced in
// the save use case (it needs the adjustment count), not here on the wire.
function validateMaterialItemUpdateForm(
  value: unknown,
  path: string,
): WorkOrderMaterialItemUpdateForm {
  const obj = requireObject(value, path, failMaterialItem)
  return {
    productId: requireString(obj.productId, `${path}.productId`, failMaterialItem),
    quantity: optionalQuantity(obj.quantity),
    notes: optionalBoundedText(obj.notes, WORK_ORDER_MATERIAL_ITEM_NOTES_MAX, `${path}.notes`, failMaterialItem) ?? "",
  }
}

export function validateWorkOrderMaterialItemsDiffInput(
  body: Record<string, unknown>,
): WorkOrderMaterialItemsDiff {
  const added = requireArray(body.added, "added", failMaterialItem).map((entry, idx) => {
    const obj = requireObject(entry, `added[${idx}]`, failMaterialItem)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failMaterialItem),
      form: validateMaterialItemCreateForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requireArray(body.modified, "modified", failMaterialItem).map((entry, idx) => {
    const obj = requireObject(entry, `modified[${idx}]`, failMaterialItem)
    const id = requireString(obj.id, `modified[${idx}].id`, failMaterialItem)
    return {
      id,
      form: validateMaterialItemUpdateForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireArray(body.deleted, "deleted", failMaterialItem).map((entry, idx) => {
    const obj = requireObject(entry, `deleted[${idx}]`, failMaterialItem)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failMaterialItem) }
  })

  return { added, modified, deleted }
}

// ---------------------------------------------------------------------------
// Sync template → new work order
// ---------------------------------------------------------------------------

export function validateSyncTemplateToWorkOrderInput(
  body: Record<string, unknown>,
): SyncTemplateToWorkOrderInput {
  return {
    templateId: requireString(body.templateId, "templateId", failWorkOrder),
  }
}

// ---------------------------------------------------------------------------
// List view query validator (search + filters + pagination)
// ---------------------------------------------------------------------------

const WORK_ORDERS_LIST_DEFAULT_PAGE_SIZE = 50
const WORK_ORDERS_LIST_MAX_PAGE_SIZE = 200

const ID_FILTER_KEYS = [
  "managementCompanyId",
  "propertyId",
  "templateId",
  "warehouseId",
  "jobTypeId",
  "statusId",
] as const

type IdFilterKey = (typeof ID_FILTER_KEYS)[number]

// scheduledFor range bounds — single-value `YYYY-MM-DD` filters.
const DATE_FILTER_KEYS = ["scheduledForStart", "scheduledForEnd"] as const
type DateFilterKey = (typeof DATE_FILTER_KEYS)[number]
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Per-column identity search — the list-view search bars. Each is a single
// free-text value carried as a one-element array (same contract as the date
// bounds), applied server-side as a case-insensitive ILIKE on its own column.
const TEXT_FILTER_KEYS = ["unitType", "unitNumber", "workOrderNumber", "description"] as const
type TextFilterKey = (typeof TEXT_FILTER_KEYS)[number]

// Vacancy enum filter — single-select, carried as a one-element array. Invalid
// values are dropped (filter off) rather than 400'd, matching optionalVacancy.
const VACANCY_VALUES = ["VACANT", "OCCUPIED"] as const

const listWorkOrdersQuerySchema = z.object({
  sort: z.enum(["asc", "desc"]).default("desc"),
  sortField: z
    .enum(["createdAt", "scheduledFor", "property", "managementCompany", "workOrderNumber"])
    .default("createdAt"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(WORK_ORDERS_LIST_MAX_PAGE_SIZE)
    .default(WORK_ORDERS_LIST_DEFAULT_PAGE_SIZE),
})

function readMultiValue(searchParams: URLSearchParams, key: string): string[] {
  return Array.from(
    new Set(
      searchParams
        .getAll(key)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
    ),
  )
}

export function validateListWorkOrdersQuery(
  searchParams: URLSearchParams,
): ListInput<WorkOrdersListFilters> {
  // Strip multi-value keys before zod sees them.
  const raw: Record<string, string> = {}
  const reservedMultiValueKeys = new Set<string>([
    ...ID_FILTER_KEYS,
    ...DATE_FILTER_KEYS,
    ...TEXT_FILTER_KEYS,
    "vacancy",
  ])
  searchParams.forEach((value, key) => {
    if (reservedMultiValueKeys.has(key)) return
    raw[key] = value
  })

  const parseResult = listWorkOrdersQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failWorkOrder(
      issue?.message ?? "Invalid work-orders list query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data

  const filterRecord: WorkOrdersListFilters = {}
  for (const key of ID_FILTER_KEYS) {
    const values = readMultiValue(searchParams, key)
    if (values.length > 0) filterRecord[key as IdFilterKey] = values
  }
  for (const key of TEXT_FILTER_KEYS) {
    const value = readMultiValue(searchParams, key)[0]
    if (value) filterRecord[key as TextFilterKey] = [value]
  }
  const vacancy = readMultiValue(searchParams, "vacancy")[0]
  if (vacancy && (VACANCY_VALUES as readonly string[]).includes(vacancy)) {
    filterRecord.vacancy = [vacancy]
  }
  for (const key of DATE_FILTER_KEYS) {
    const value = readMultiValue(searchParams, key)[0]
    if (!value) continue
    if (!DATE_ONLY_PATTERN.test(value)) {
      failWorkOrder(`${key} must be a YYYY-MM-DD date`, key)
    }
    filterRecord[key as DateFilterKey] = [value]
  }

  const hasAnyFilter = Object.keys(filterRecord).length > 0

  return {
    sort: { field: parsed.sortField, direction: parsed.sort },
    ...(hasAnyFilter ? { filters: filterRecord } : {}),
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// ---------------------------------------------------------------------------
// Picker / options search validators (adjustment relink dropdowns)
// ---------------------------------------------------------------------------

const WO_OPTIONS_DEFAULT_TAKE = 20
const WO_OPTIONS_MAX_TAKE = 50

const workOrderOptionsSearchQuerySchema = z.object({
  search: z.string().optional(),
  productId: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(WO_OPTIONS_MAX_TAKE)
    .default(WO_OPTIONS_DEFAULT_TAKE),
})

export type ValidatedWorkOrderOptionsSearchQuery = {
  search?: string
  productId?: string
  skip: number
  take: number
}

export function validateWorkOrderOptionsSearchQuery(
  searchParams: URLSearchParams,
): ValidatedWorkOrderOptionsSearchQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })
  const parseResult = workOrderOptionsSearchQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failWorkOrder(
      issue?.message ?? "Invalid work-order options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }
  const parsed = parseResult.data
  const trimSearch = parsed.search?.trim()
  const trimProductId = parsed.productId?.trim()
  return {
    ...(trimSearch ? { search: trimSearch } : {}),
    ...(trimProductId ? { productId: trimProductId } : {}),
    skip: parsed.skip,
    take: parsed.take,
  }
}

const WOMI_OPTIONS_DEFAULT_TAKE = 50
const WOMI_OPTIONS_MAX_TAKE = 100

const workOrderMaterialItemOptionsQuerySchema = z.object({
  productId: z.string().min(1, "productId is required"),
  take: z.coerce
    .number()
    .int()
    .min(1)
    .max(WOMI_OPTIONS_MAX_TAKE)
    .default(WOMI_OPTIONS_DEFAULT_TAKE),
})

export type ValidatedWorkOrderMaterialItemOptionsQuery = {
  productId: string
  take: number
}

export function validateWorkOrderMaterialItemOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedWorkOrderMaterialItemOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })
  const parseResult = workOrderMaterialItemOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failMaterialItem(
      issue?.message ?? "Invalid material-item options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }
  const parsed = parseResult.data
  return {
    productId: parsed.productId.trim(),
    take: parsed.take,
  }
}
