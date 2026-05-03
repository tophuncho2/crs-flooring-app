import {
  WorkOrderCutLogExecutionError,
  WorkOrderExecutionError,
  WorkOrderMaterialItemExecutionError,
} from "@builders/application"
import type {
  CreateWorkOrderUseCaseInput,
  UpdateWorkOrderUseCaseInput,
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
  throw new WorkOrderCutLogExecutionError({
    code: "WORK_ORDER_CUT_LOG_VALIDATION_FAILED",
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
    instructions: optionalText(body.instructions),
    notes: optionalText(body.notes),
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
  if ("instructions" in body) input.instructions = optionalText(body.instructions)
  if ("notes" in body) input.notes = optionalText(body.notes)
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

export type ValidatedUpdatePendingCutLogPatch = {
  cut?: string
  isWaste?: boolean
  notes?: string
}

export type ValidatedUpdatePendingCutLogInput = {
  workOrderItemId: string
  patch: ValidatedUpdatePendingCutLogPatch
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
  if (Object.keys(patch).length === 0) {
    failCutLog("Patch must contain at least one of cut, isWaste, or notes", "patch")
  }
  return {
    workOrderItemId: requireString(body.workOrderItemId, "workOrderItemId", failCutLog),
    patch,
  }
}

export type ValidatedDeletePendingCutLogInput = {
  workOrderItemId: string
}

export function validateDeletePendingCutLogInput(
  body: Record<string, unknown>,
): ValidatedDeletePendingCutLogInput {
  return {
    workOrderItemId: requireString(body.workOrderItemId, "workOrderItemId", failCutLog),
  }
}

// ---------------------------------------------------------------------------
// Finalize cut-log (WO-scoped, single row per request)
// ---------------------------------------------------------------------------

export type ValidatedFinalizeWorkOrderCutLogInput = {
  cutLogId: string
}

export function validateFinalizeWorkOrderCutLogInput(
  body: Record<string, unknown>,
): ValidatedFinalizeWorkOrderCutLogInput {
  return {
    cutLogId: requireString(body.cutLogId, "cutLogId", failCutLog),
  }
}
