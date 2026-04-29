import { TemplateExecutionError, TemplateMaterialItemExecutionError } from "@builders/application"
import type {
  CreateTemplateUseCaseInput,
  UpdateTemplateUseCaseInput,
} from "@builders/application"
import type { TemplateMaterialItemForm, TemplateMaterialItemsDiff } from "@builders/domain"

function failTemplate(message: string, field?: string): never {
  throw new TemplateExecutionError({
    code: "TEMPLATE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function failDiff(message: string, field?: string): never {
  throw new TemplateMaterialItemExecutionError({
    code: "TEMPLATE_MATERIAL_ITEM_VALIDATION_FAILED",
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

export function validateCreateTemplateInput(
  body: Record<string, unknown>,
): CreateTemplateUseCaseInput {
  return {
    propertyId: requireString(body.propertyId, "propertyId", failTemplate),
    managementCompanyId: optionalString(body.managementCompanyId),
    jobTypeId: optionalString(body.jobTypeId),
    warehouseId: optionalString(body.warehouseId),
    unitType: requireString(body.unitType, "unitType", failTemplate),
    description: optionalText(body.description),
    instructions: optionalText(body.instructions),
    templateNotes: optionalText(body.templateNotes),
  }
}

export function validateUpdateTemplateInput(
  body: Record<string, unknown>,
): UpdateTemplateUseCaseInput {
  const input: UpdateTemplateUseCaseInput = {}

  if ("propertyId" in body) input.propertyId = requireString(body.propertyId, "propertyId", failTemplate)
  if ("managementCompanyId" in body) input.managementCompanyId = optionalString(body.managementCompanyId)
  if ("jobTypeId" in body) input.jobTypeId = optionalString(body.jobTypeId)
  if ("warehouseId" in body) input.warehouseId = optionalString(body.warehouseId)
  if ("unitType" in body) input.unitType = requireString(body.unitType, "unitType", failTemplate)
  if ("description" in body) input.description = optionalText(body.description)
  if ("instructions" in body) input.instructions = optionalText(body.instructions)
  if ("templateNotes" in body) input.templateNotes = optionalText(body.templateNotes)

  return input
}

function requireArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failDiff(`${path} must be an array`, path)
  return value
}

function requireObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failDiff(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

function validateMaterialItemForm(value: unknown, path: string): TemplateMaterialItemForm {
  const obj = requireObject(value, path)
  return {
    productId: requireString(obj.productId, `${path}.productId`, failDiff),
    quantity: requireString(obj.quantity, `${path}.quantity`, failDiff),
    notes: typeof obj.notes === "string" ? obj.notes : "",
  }
}

export function validateTemplateMaterialItemsDiffInput(
  body: Record<string, unknown>,
): TemplateMaterialItemsDiff {
  const added = requireArray(body.added, "added").map((entry, idx) => {
    const obj = requireObject(entry, `added[${idx}]`)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failDiff),
      form: validateMaterialItemForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requireArray(body.modified, "modified").map((entry, idx) => {
    const obj = requireObject(entry, `modified[${idx}]`)
    return {
      id: requireString(obj.id, `modified[${idx}].id`, failDiff),
      form: validateMaterialItemForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireArray(body.deleted, "deleted").map((entry, idx) => {
    const obj = requireObject(entry, `deleted[${idx}]`)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failDiff) }
  })

  return { added, modified, deleted }
}
