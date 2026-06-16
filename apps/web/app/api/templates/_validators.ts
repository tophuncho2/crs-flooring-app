import { z } from "zod"
import { TemplateExecutionError, TemplateMaterialItemExecutionError } from "@builders/application"
import type {
  CreateTemplateUseCaseInput,
  ListInput,
  TemplatesListFilters,
  UpdateTemplateUseCaseInput,
} from "@builders/application"
import {
  LIST_TEMPLATES_MAX_PAGE_SIZE,
  LIST_TEMPLATES_PAGE_SIZE,
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_INSTALLER_INSTRUCTIONS_MAX,
  TEMPLATE_INTERNAL_NOTES_MAX,
  TEMPLATE_MATERIAL_ITEM_NOTES_MAX,
  TEMPLATE_UNIT_TYPE_MAX,
  type TemplateMaterialItemForm,
  type TemplateMaterialItemsDiff,
} from "@builders/domain"

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

// Quantity is optional on a material item — a missing/blank value is carried
// as an empty string ("unset") and persisted as NULL downstream. A provided
// value is validated (> 0) by the domain rule, not here.
function optionalQuantity(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function requireBoundedString(
  value: unknown,
  max: number,
  field: string,
  fail: (m: string, f?: string) => never,
): string {
  const trimmed = requireString(value, field, fail)
  if (trimmed.length > max) fail(`${field} must be ${max} characters or fewer`, field)
  return trimmed
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

export function validateCreateTemplateInput(
  body: Record<string, unknown>,
): CreateTemplateUseCaseInput {
  return {
    propertyId: requireString(body.propertyId, "propertyId", failTemplate),
    jobTypeId: optionalString(body.jobTypeId),
    warehouseId: optionalString(body.warehouseId),
    unitType: requireBoundedString(body.unitType, TEMPLATE_UNIT_TYPE_MAX, "unitType", failTemplate),
    description: optionalBoundedText(body.description, TEMPLATE_DESCRIPTION_MAX, "description", failTemplate),
    internalNotes: optionalBoundedText(
      body.internalNotes,
      TEMPLATE_INTERNAL_NOTES_MAX,
      "internalNotes",
      failTemplate,
    ),
    installerInstructions: optionalBoundedText(
      body.installerInstructions,
      TEMPLATE_INSTALLER_INSTRUCTIONS_MAX,
      "installerInstructions",
      failTemplate,
    ),
  }
}

export function validateUpdateTemplateInput(
  body: Record<string, unknown>,
): UpdateTemplateUseCaseInput {
  const input: UpdateTemplateUseCaseInput = {}

  if ("propertyId" in body) input.propertyId = requireString(body.propertyId, "propertyId", failTemplate)
  if ("jobTypeId" in body) input.jobTypeId = optionalString(body.jobTypeId)
  if ("warehouseId" in body) input.warehouseId = optionalString(body.warehouseId)
  if ("unitType" in body) {
    input.unitType = requireBoundedString(body.unitType, TEMPLATE_UNIT_TYPE_MAX, "unitType", failTemplate)
  }
  if ("description" in body) {
    input.description = optionalBoundedText(body.description, TEMPLATE_DESCRIPTION_MAX, "description", failTemplate)
  }
  if ("internalNotes" in body) {
    input.internalNotes = optionalBoundedText(
      body.internalNotes,
      TEMPLATE_INTERNAL_NOTES_MAX,
      "internalNotes",
      failTemplate,
    )
  }
  if ("installerInstructions" in body) {
    input.installerInstructions = optionalBoundedText(
      body.installerInstructions,
      TEMPLATE_INSTALLER_INSTRUCTIONS_MAX,
      "installerInstructions",
      failTemplate,
    )
  }

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
    quantity: optionalQuantity(obj.quantity),
    notes: optionalBoundedText(obj.notes, TEMPLATE_MATERIAL_ITEM_NOTES_MAX, `${path}.notes`, failDiff) ?? "",
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

// --- List view query validator (search + filters + pagination) ---

const TEMPLATES_FILTER_KEYS = ["managementCompanyId", "propertyId"] as const
type TemplatesFilterKey = (typeof TEMPLATES_FILTER_KEYS)[number]

const listTemplatesQuerySchema = z.object({
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_TEMPLATES_MAX_PAGE_SIZE)
    .default(LIST_TEMPLATES_PAGE_SIZE),
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

export function validateListTemplatesQuery(
  searchParams: URLSearchParams,
): ListInput<TemplatesListFilters> {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    if ((TEMPLATES_FILTER_KEYS as readonly string[]).includes(key)) return
    raw[key] = value
  })

  const parseResult = listTemplatesQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    throw new TemplateExecutionError({
      code: "TEMPLATE_VALIDATION_FAILED",
      message: issue?.message ?? "Invalid templates list query",
      status: 400,
      ...(issue?.path[0] ? { field: String(issue.path[0]) } : {}),
    })
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.q?.trim()
  const search = trimmedSearch ? trimmedSearch : undefined

  const filterEntries: Array<[TemplatesFilterKey, string[]]> = TEMPLATES_FILTER_KEYS.map(
    (key) => [key, readMultiValue(searchParams, key)],
  )
  const filterRecord: Partial<TemplatesListFilters> = {}
  for (const [key, values] of filterEntries) {
    if (values.length > 0) filterRecord[key] = values
  }
  const hasAnyFilter = Object.keys(filterRecord).length > 0

  return {
    search,
    filters: hasAnyFilter ? (filterRecord as TemplatesListFilters) : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

const templateOptionsQuerySchema = z.object({
  search: z.string().optional(),
  // Both scopes optional: property wins, else MC scopes via the property
  // relation, else the search is unscoped (lists all templates).
  propertyId: z.string().optional(),
  managementCompanyId: z.string().optional(),
  skip: z.coerce.number().int().min(0).default(0),
  take: z.coerce.number().int().min(1).max(50).default(20),
})

export type ValidatedTemplateOptionsQuery = {
  search?: string
  propertyId?: string
  managementCompanyId?: string
  skip: number
  take: number
}

export function validateTemplateOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedTemplateOptionsQuery {
  const raw: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    raw[key] = value
  })

  const parseResult = templateOptionsQuerySchema.safeParse(raw)
  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]
    failTemplate(
      issue?.message ?? "Invalid template options query",
      issue?.path[0] ? String(issue.path[0]) : undefined,
    )
  }

  const parsed = parseResult.data
  const trimmedSearch = parsed.search?.trim()
  const trimmedPropertyId = parsed.propertyId?.trim()
  const trimmedManagementCompanyId = parsed.managementCompanyId?.trim()
  return {
    search: trimmedSearch ? trimmedSearch : undefined,
    propertyId: trimmedPropertyId ? trimmedPropertyId : undefined,
    managementCompanyId: trimmedManagementCompanyId ? trimmedManagementCompanyId : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
