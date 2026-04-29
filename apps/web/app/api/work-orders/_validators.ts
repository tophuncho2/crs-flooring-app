import {
  WorkOrderCutLogExecutionError,
  WorkOrderExecutionError,
  WorkOrderMaterialItemExecutionError,
} from "@builders/application"
import type {
  CreateWorkOrderUseCaseInput,
  UpdateWorkOrderUseCaseInput,
  WorkOrderCutLogPendingDelete,
  WorkOrderCutLogPendingDiff,
  WorkOrderCutLogPendingDraft,
  WorkOrderCutLogPendingUpdate,
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
// Pending cut-log diff (per WOMI)
// ---------------------------------------------------------------------------

function validatePendingDraft(value: unknown, path: string): WorkOrderCutLogPendingDraft {
  const obj = requireObject(value, path, failCutLog)
  const isWaste = typeof obj.isWaste === "boolean" ? obj.isWaste : false
  return {
    tempId: requireString(obj.tempId, `${path}.tempId`, failCutLog),
    inventoryId: requireString(obj.inventoryId, `${path}.inventoryId`, failCutLog),
    cut: requireString(obj.cut, `${path}.cut`, failCutLog),
    isWaste,
    notes: typeof obj.notes === "string" ? obj.notes : "",
  }
}

function validatePendingUpdate(value: unknown, path: string): WorkOrderCutLogPendingUpdate {
  const obj = requireObject(value, path, failCutLog)
  const patch = requireObject(obj.patch, `${path}.patch`, failCutLog)
  const patchOut: WorkOrderCutLogPendingUpdate["patch"] = {}
  if ("cut" in patch) patchOut.cut = requireString(patch.cut, `${path}.patch.cut`, failCutLog)
  if ("isWaste" in patch && typeof patch.isWaste === "boolean") patchOut.isWaste = patch.isWaste
  if ("notes" in patch && typeof patch.notes === "string") patchOut.notes = patch.notes
  return {
    id: requireString(obj.id, `${path}.id`, failCutLog),
    expectedUpdatedAt: requireString(obj.expectedUpdatedAt, `${path}.expectedUpdatedAt`, failCutLog),
    patch: patchOut,
  }
}

function validatePendingDelete(value: unknown, path: string): WorkOrderCutLogPendingDelete {
  const obj = requireObject(value, path, failCutLog)
  return {
    id: requireString(obj.id, `${path}.id`, failCutLog),
    expectedUpdatedAt: requireString(obj.expectedUpdatedAt, `${path}.expectedUpdatedAt`, failCutLog),
  }
}

export type ValidatedWorkOrderItemPendingCutLogDiffInput = {
  requestKey: string
  diff: WorkOrderCutLogPendingDiff
}

export function validateWorkOrderItemPendingCutLogDiffInput(
  body: Record<string, unknown>,
): ValidatedWorkOrderItemPendingCutLogDiffInput {
  const diffBody = requireObject(body.diff, "diff", failCutLog)
  const added = requireArray(diffBody.added, "diff.added", failCutLog).map((entry, idx) =>
    validatePendingDraft(entry, `diff.added[${idx}]`),
  )
  const modified = requireArray(diffBody.modified, "diff.modified", failCutLog).map((entry, idx) =>
    validatePendingUpdate(entry, `diff.modified[${idx}]`),
  )
  const deleted = requireArray(diffBody.deleted, "diff.deleted", failCutLog).map((entry, idx) =>
    validatePendingDelete(entry, `diff.deleted[${idx}]`),
  )

  return {
    requestKey: requireString(body.requestKey, "requestKey", failCutLog),
    diff: { added, modified, deleted },
  }
}

// ---------------------------------------------------------------------------
// Finalize cut-log batch (WO-scoped)
// ---------------------------------------------------------------------------

export type ValidatedFinalizeWorkOrderCutLogBatchInput = {
  requestKey: string
  cutLogIds: string[]
}

export function validateFinalizeWorkOrderCutLogBatchInput(
  body: Record<string, unknown>,
): ValidatedFinalizeWorkOrderCutLogBatchInput {
  const cutLogIdsRaw = requireArray(body.cutLogIds, "cutLogIds", failCutLog)
  if (cutLogIdsRaw.length === 0) {
    failCutLog("Select at least one cut log to finalize", "cutLogIds")
  }
  const cutLogIds = cutLogIdsRaw.map((entry, idx) =>
    requireString(entry, `cutLogIds[${idx}]`, failCutLog),
  )
  return {
    requestKey: requireString(body.requestKey, "requestKey", failCutLog),
    cutLogIds,
  }
}
