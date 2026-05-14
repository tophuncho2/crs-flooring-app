import { z } from "zod"
import {
  CutLogExecutionError,
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
import type {
  WorkOrderMaterialItemForm,
  WorkOrderMaterialItemsDiff,
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

function failCutLog(message: string, field?: string): never {
  throw new CutLogExecutionError({
    code: "CUT_LOG_VALIDATION_FAILED",
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

function optionalText(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
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
    unitNumber: optionalText(body.unitNumber),
    unitType: optionalText(body.unitType),
    customAddress: optionalText(body.customAddress),
    description: optionalText(body.description),
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
  if ("unitNumber" in body) input.unitNumber = optionalText(body.unitNumber)
  if ("unitType" in body) input.unitType = optionalText(body.unitType)
  if ("customAddress" in body) input.customAddress = optionalText(body.customAddress)
  if ("description" in body) input.description = optionalText(body.description)
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

function validateMaterialItemForm(value: unknown, path: string): WorkOrderMaterialItemForm {
  const obj = requireObject(value, path, failMaterialItem)
  return {
    productId: requireString(obj.productId, `${path}.productId`, failMaterialItem),
    quantity: requireString(obj.quantity, `${path}.quantity`, failMaterialItem),
    notes: typeof obj.notes === "string" ? obj.notes : "",
  }
}

export function validateWorkOrderMaterialItemsDiffInput(
  body: Record<string, unknown>,
): WorkOrderMaterialItemsDiff {
  const added = requireArray(body.added, "added", failMaterialItem).map((entry, idx) => {
    const obj = requireObject(entry, `added[${idx}]`, failMaterialItem)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failMaterialItem),
      form: validateMaterialItemForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requireArray(body.modified, "modified", failMaterialItem).map((entry, idx) => {
    const obj = requireObject(entry, `modified[${idx}]`, failMaterialItem)
    return {
      id: requireString(obj.id, `modified[${idx}].id`, failMaterialItem),
      form: validateMaterialItemForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireArray(body.deleted, "deleted", failMaterialItem).map((entry, idx) => {
    const obj = requireObject(entry, `deleted[${idx}]`, failMaterialItem)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failMaterialItem) }
  })

  return { added, modified, deleted }
}

// ---------------------------------------------------------------------------
// Per-row pending cut-log mutations (sync; one row per request)
// ---------------------------------------------------------------------------
//
// Each validator returns the operational portion of the body — every
// route adds the path-derived `workOrderId` (and `cutLogId` for
// update/delete) before calling its use case. `expectedUpdatedAt` for
// update + delete travels through the mutation envelope's
// `expectedUpdatedAt` field (parsed by `parseMutationEnvelope` with
// `requireExpectedUpdatedAt: true`), not the input body, so it is not
// part of the validator's output.

export type ValidatedCreatePendingCutLogInput = {
  workOrderItemId: string
  inventoryId: string
  cut: string
  isWaste: boolean
  notes: string
}

export function validateCreatePendingCutLogInput(
  body: Record<string, unknown>,
): ValidatedCreatePendingCutLogInput {
  const isWaste = typeof body.isWaste === "boolean" ? body.isWaste : false
  return {
    workOrderItemId: requireString(body.workOrderItemId, "workOrderItemId", failCutLog),
    inventoryId: requireString(body.inventoryId, "inventoryId", failCutLog),
    cut: requireString(body.cut, "cut", failCutLog),
    isWaste,
    notes: typeof body.notes === "string" ? body.notes : "",
  }
}

export type ValidatedUpdatePendingCutLogLink = {
  workOrderId: string | null
  workOrderItemId: string | null
}

export type ValidatedUpdatePendingCutLogPatch = {
  cut?: string
  isWaste?: boolean
  notes?: string
  link?: ValidatedUpdatePendingCutLogLink
}

export type ValidatedUpdatePendingCutLogInput = {
  patch: ValidatedUpdatePendingCutLogPatch
}

function validateUpdatePendingCutLogLink(
  value: unknown,
): ValidatedUpdatePendingCutLogLink {
  const obj = requireObject(value, "patch.link", failCutLog)
  const rawWO = obj.workOrderId
  const rawWOMI = obj.workOrderItemId
  if (rawWO !== null && typeof rawWO !== "string") {
    failCutLog("patch.link.workOrderId must be a string or null", "patch.link.workOrderId")
  }
  if (rawWOMI !== null && typeof rawWOMI !== "string") {
    failCutLog(
      "patch.link.workOrderItemId must be a string or null",
      "patch.link.workOrderItemId",
    )
  }
  const workOrderId =
    rawWO === null ? null : (rawWO as string).trim() || (failCutLog("patch.link.workOrderId is required when present", "patch.link.workOrderId") as never)
  const workOrderItemId =
    rawWOMI === null ? null : (rawWOMI as string).trim() || (failCutLog("patch.link.workOrderItemId is required when present", "patch.link.workOrderItemId") as never)
  // Both-or-neither: surface the asymmetry here so the use case never
  // has to handle a half-set link patch.
  if ((workOrderId === null) !== (workOrderItemId === null)) {
    failCutLog(
      "patch.link must set both workOrderId and workOrderItemId or both to null",
      "patch.link",
    )
  }
  return { workOrderId, workOrderItemId }
}

export function validateUpdatePendingCutLogInput(
  body: Record<string, unknown>,
): ValidatedUpdatePendingCutLogInput {
  const patchBody = requireObject(body.patch, "patch", failCutLog)
  const patch: ValidatedUpdatePendingCutLogPatch = {}
  if ("cut" in patchBody) {
    patch.cut = requireString(patchBody.cut, "patch.cut", failCutLog)
  }
  if ("isWaste" in patchBody && typeof patchBody.isWaste === "boolean") {
    patch.isWaste = patchBody.isWaste
  }
  if ("notes" in patchBody && typeof patchBody.notes === "string") {
    patch.notes = patchBody.notes
  }
  if ("link" in patchBody) {
    patch.link = validateUpdatePendingCutLogLink(patchBody.link)
  }
  if (Object.keys(patch).length === 0) {
    failCutLog(
      "Patch must contain at least one of cut, isWaste, notes, or link",
      "patch",
    )
  }
  return { patch }
}

export type ValidatedDeletePendingCutLogInput = Record<string, never>

export function validateDeletePendingCutLogInput(
  _body: Record<string, unknown>,
): ValidatedDeletePendingCutLogInput {
  return {}
}

// (Cut-log finalize is now resource-level: `/api/work-orders/[id]/cut-logs/[cutLogId]/finalize`.
// The route reads cutLogId from the URL and takes an empty body, so no
// validator is required.)

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
    sort: { field: "workOrderNumber", direction: "desc" },
    ...(hasAnyFilter ? { filters: filterRecord } : {}),
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}
