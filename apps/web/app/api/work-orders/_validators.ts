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
  buildWorkOrderMaterialItemProductLockedMessage,
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

function optionalBoolean(value: unknown): boolean | undefined {
  if (typeof value !== "boolean") return undefined
  return value
}

function optionalVacancy(value: unknown): "VACANT" | "OCCUPIED" | null {
  if (value === undefined || value === null) return null
  if (value === "VACANT" || value === "OCCUPIED") return value
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
    warehouseId: requireString(body.warehouseId, "warehouseId", failWorkOrder),
    templateId: optionalString(body.templateId),
    managementCompanyId: optionalString(body.managementCompanyId),
    jobTypeId: optionalString(body.jobTypeId),
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
    isComplete: optionalBoolean(body.isComplete),
    vacancy: optionalVacancy(body.vacancy),
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
    input.warehouseId = requireString(body.warehouseId, "warehouseId", failWorkOrder)
  }
  if ("templateId" in body) input.templateId = optionalString(body.templateId)
  if ("managementCompanyId" in body) input.managementCompanyId = optionalString(body.managementCompanyId)
  if ("jobTypeId" in body) input.jobTypeId = optionalString(body.jobTypeId)
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
  if ("isComplete" in body) {
    const isComplete = optionalBoolean(body.isComplete)
    if (isComplete !== undefined) input.isComplete = isComplete
  }
  if ("vacancy" in body) input.vacancy = optionalVacancy(body.vacancy)

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

// Update form is locked to quantity + notes — `productId` is immutable
// post-create. Any caller that passes it gets a 400 with
// WORK_ORDER_MATERIAL_ITEM_PRODUCT_LOCKED. Mirrors the products module's
// categoryId carve-out in `apps/web/app/api/products/_validators.ts`.
function validateMaterialItemUpdateForm(
  value: unknown,
  path: string,
  ref: string,
): WorkOrderMaterialItemUpdateForm {
  const obj = requireObject(value, path, failMaterialItem)
  if (obj.productId !== undefined) {
    throw new WorkOrderMaterialItemExecutionError({
      code: "WORK_ORDER_MATERIAL_ITEM_PRODUCT_LOCKED",
      message: buildWorkOrderMaterialItemProductLockedMessage(),
      status: 400,
      field: `${path}.productId`,
      payload: { refKind: "id", ref },
    })
  }
  return {
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
      form: validateMaterialItemUpdateForm(obj.form, `modified[${idx}].form`, id),
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
] as const

type IdFilterKey = (typeof ID_FILTER_KEYS)[number]

const IS_COMPLETE_VALUES = ["hide", "only", "all"] as const

const listWorkOrdersQuerySchema = z.object({
  q: z.string().optional(),
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
  const reservedMultiValueKeys = new Set<string>([...ID_FILTER_KEYS, "isComplete"])
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
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  const filterRecord: WorkOrdersListFilters = {}
  for (const key of ID_FILTER_KEYS) {
    const values = readMultiValue(searchParams, key)
    if (values.length > 0) filterRecord[key as IdFilterKey] = values
  }
  const completeValues = readMultiValue(searchParams, "isComplete").filter((value) =>
    (IS_COMPLETE_VALUES as readonly string[]).includes(value),
  )
  if (completeValues.length > 0) {
    filterRecord.isComplete = [completeValues[0]]
  }

  const hasAnyFilter = Object.keys(filterRecord).length > 0

  return {
    search,
    sort: { field: "createdAt", direction: "desc" },
    ...(hasAnyFilter ? { filters: filterRecord } : {}),
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// ---------------------------------------------------------------------------
// Picker / options search validators (cut-log relink dropdowns)
// ---------------------------------------------------------------------------

const WO_OPTIONS_DEFAULT_TAKE = 20
const WO_OPTIONS_MAX_TAKE = 50

const workOrderOptionsSearchQuerySchema = z.object({
  warehouseId: z.string().min(1, "warehouseId is required"),
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
  warehouseId: string
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
    warehouseId: parsed.warehouseId.trim(),
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
