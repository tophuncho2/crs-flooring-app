import { z } from "zod"
import {
  TemplateEntityInvolvementExecutionError,
  TemplateExecutionError,
  TemplatePlannedPaymentExecutionError,
  TemplatePlannedProductExecutionError,
  TemplateServiceItemExecutionError,
} from "@builders/application"
import type {
  CreateTemplateUseCaseInput,
  ListInput,
  ListSort,
  TemplatesListFilters,
  UpdateTemplateUseCaseInput,
} from "@builders/application"
import {
  isServiceItemType,
  isValidMoneyAmount,
  normalizeMoneyAmount,
  SERVICE_ITEM_TYPE_INVALID_MESSAGE,
  LIST_TEMPLATES_MAX_PAGE_SIZE,
  LIST_TEMPLATES_PAGE_SIZE,
  TEMPLATE_CUSTOMER_NAME_MAX,
  TEMPLATE_DESCRIPTION_MAX,
  TEMPLATE_ENTITY_INVOLVEMENT_TYPE_MAX,
  TEMPLATE_INSTALLER_INSTRUCTIONS_MAX,
  TEMPLATE_INTERNAL_NOTES_MAX,
  TEMPLATE_PLANNED_PAYMENT_NOTES_MAX,
  TEMPLATE_PLANNED_PRODUCT_NOTES_MAX,
  TEMPLATE_SERVICE_ITEM_ITEM_NAME_MAX,
  TEMPLATE_UNIT_TYPE_MAX,
  type FlooringPaymentDirection,
  type TemplateEntityInvolvementForm,
  type TemplateEntityInvolvementsDiff,
  type TemplatePlannedPaymentForm,
  type TemplatePlannedPaymentsDiff,
  type TemplatePlannedProductForm,
  type TemplatePlannedProductsDiff,
  type TemplateServiceItemForm,
  type TemplateServiceItemsDiff,
} from "@builders/domain"
import {
  optionsQuerySchema,
  parseQuery,
  requireColor,
  requireString,
} from "@/app/api/_shared/validators"

function failTemplate(message: string, field?: string): never {
  throw new TemplateExecutionError({
    code: "TEMPLATE_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function failDiff(message: string, field?: string): never {
  throw new TemplatePlannedProductExecutionError({
    code: "TEMPLATE_PLANNED_PRODUCT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Quantity is optional on a planned product — a missing/blank value is carried
// as an empty string ("unset") and persisted as NULL downstream. A provided
// value is validated (> 0) by the domain rule, not here.
function optionalQuantity(value: unknown): string {
  return typeof value === "string" ? value : ""
}

// Optional money field (money standard): missing/blank → "" (unset), otherwise
// validate + canonicalize to a fixed-scale-2 string. Takes a `fail` callback so
// each caller throws its own section's error class (the client keys off the code).
function optionalMoney(
  value: unknown,
  path: string,
  fail: (m: string, f?: string) => never,
): string {
  if (typeof value !== "string" || value.trim() === "") return ""
  if (!isValidMoneyAmount(value)) fail(`${path} must be a valid amount`, path)
  return normalizeMoneyAmount(value)
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
    // Property is optional — a template always has an auto-generated number.
    propertyId: optionalString(body.propertyId),
    jobTypeId: optionalString(body.jobTypeId),
    warehouseId: optionalString(body.warehouseId),
    unitType: requireBoundedString(body.unitType, TEMPLATE_UNIT_TYPE_MAX, "unitType", failTemplate),
    customerName: optionalBoundedText(body.customerName, TEMPLATE_CUSTOMER_NAME_MAX, "customerName", failTemplate),
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
    totalTransaction: optionalMoney(body.totalTransaction, "totalTransaction", failTemplate),
  }
}

export function validateUpdateTemplateInput(
  body: Record<string, unknown>,
): UpdateTemplateUseCaseInput {
  const input: UpdateTemplateUseCaseInput = {}

  // Property is optional and may be cleared (null).
  if ("propertyId" in body) input.propertyId = optionalString(body.propertyId)
  if ("jobTypeId" in body) input.jobTypeId = optionalString(body.jobTypeId)
  if ("warehouseId" in body) input.warehouseId = optionalString(body.warehouseId)
  if ("unitType" in body) {
    input.unitType = requireBoundedString(body.unitType, TEMPLATE_UNIT_TYPE_MAX, "unitType", failTemplate)
  }
  if ("customerName" in body) {
    input.customerName = optionalBoundedText(body.customerName, TEMPLATE_CUSTOMER_NAME_MAX, "customerName", failTemplate)
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
  if ("totalTransaction" in body) {
    input.totalTransaction = optionalMoney(body.totalTransaction, "totalTransaction", failTemplate)
  }
  // Edit-only palette tag — strict when present, left unchanged when absent
  // (a stale client). Create has no equivalent (defaults to SLATE in the DB).
  if ("color" in body) input.color = requireColor(body.color, "color", failTemplate)

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

function validatePlannedProductForm(value: unknown, path: string): TemplatePlannedProductForm {
  const obj = requireObject(value, path)
  return {
    productId: requireString(obj.productId, `${path}.productId`, failDiff),
    // Editable unit FK (UoM epic 2C); "" = no unit.
    unitId: optionalString(obj.unitId) ?? "",
    quantity: optionalQuantity(obj.quantity),
    // No stored money column — bid cost is a live product join (the line-total
    // basis), not a form field.
    notes: optionalBoundedText(obj.notes, TEMPLATE_PLANNED_PRODUCT_NOTES_MAX, `${path}.notes`, failDiff) ?? "",
  }
}

export function validateTemplatePlannedProductsDiffInput(
  body: Record<string, unknown>,
): TemplatePlannedProductsDiff {
  const added = requireArray(body.added, "added").map((entry, idx) => {
    const obj = requireObject(entry, `added[${idx}]`)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failDiff),
      form: validatePlannedProductForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requireArray(body.modified, "modified").map((entry, idx) => {
    const obj = requireObject(entry, `modified[${idx}]`)
    return {
      id: requireString(obj.id, `modified[${idx}].id`, failDiff),
      form: validatePlannedProductForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireArray(body.deleted, "deleted").map((entry, idx) => {
    const obj = requireObject(entry, `deleted[${idx}]`)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failDiff) }
  })

  return { added, modified, deleted }
}

// --- Service / misc items section diff validator ---
// The second table in the "products" section. No product link. itemType is a
// REQUIRED enum (ServiceItemType); itemName is free-text (bounded); bidCost is a
// MANUAL money column (unlike planned products' live product-cost join). Uses its OWN structural
// require helpers so EVERY error (structural + field-level) throws the service-item
// error class + code — the client keys off it to route errors to the right table
// (mirrors the planned-payments precedent).

function failServiceItem(message: string, field?: string): never {
  throw new TemplateServiceItemExecutionError({
    code: "TEMPLATE_SERVICE_ITEM_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requireServiceItemsArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failServiceItem(`${path} must be an array`, path)
  return value
}

function requireServiceItemsObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failServiceItem(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

// itemType is a REQUIRED enum (ServiceItemType) — must be one of the known members,
// else a 400 keyed to the service-item error class (mirrors `_shared` requireColor).
function requireServiceItemType(value: unknown, path: string): string {
  if (!isServiceItemType(value)) failServiceItem(SERVICE_ITEM_TYPE_INVALID_MESSAGE, `${path}.itemType`)
  return value
}

function validateServiceItemForm(value: unknown, path: string): TemplateServiceItemForm {
  const obj = requireServiceItemsObject(value, path)
  return {
    itemType: requireServiceItemType(obj.itemType, path),
    itemName:
      optionalBoundedText(obj.itemName, TEMPLATE_SERVICE_ITEM_ITEM_NAME_MAX, `${path}.itemName`, failServiceItem) ?? "",
    quantity: optionalQuantity(obj.quantity),
    // Editable unit FK (UoM epic 2C); "" = no unit.
    unitId: optionalString(obj.unitId) ?? "",
    // Job-costing money column (money standard) — blank clears, else validated +
    // canonicalized. bidCost is MANUAL here (a persisted column, not a join) and is
    // the per-unit basis for the derived line total.
    bidCost: optionalMoney(obj.bidCost, `${path}.bidCost`, failServiceItem),
  }
}

export function validateTemplateServiceItemsDiffInput(
  body: Record<string, unknown>,
): TemplateServiceItemsDiff {
  const added = requireServiceItemsArray(body.added, "added").map((entry, idx) => {
    const obj = requireServiceItemsObject(entry, `added[${idx}]`)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failServiceItem),
      form: validateServiceItemForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requireServiceItemsArray(body.modified, "modified").map((entry, idx) => {
    const obj = requireServiceItemsObject(entry, `modified[${idx}]`)
    return {
      id: requireString(obj.id, `modified[${idx}].id`, failServiceItem),
      form: validateServiceItemForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireServiceItemsArray(body.deleted, "deleted").map((entry, idx) => {
    const obj = requireServiceItemsObject(entry, `deleted[${idx}]`)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failServiceItem) }
  })

  return { added, modified, deleted }
}

// --- Combined "products" section input ---
// The section saves BOTH tables in one atomic PATCH: { plannedProducts, serviceItems },
// each a section diff. One transaction so a single Save is all-or-nothing across
// both grids (and one round-trip). NOTE: child-row writes don't bump the parent
// `template.updatedAt`, so the section's optimistic-concurrency token only guards
// against a concurrent PARENT edit, not concurrent child edits.
export function validateTemplateProductsSectionInput(
  body: Record<string, unknown>,
): { plannedProducts: TemplatePlannedProductsDiff; serviceItems: TemplateServiceItemsDiff } {
  return {
    plannedProducts: validateTemplatePlannedProductsDiffInput(
      requireObject(body.plannedProducts, "plannedProducts"),
    ),
    serviceItems: validateTemplateServiceItemsDiffInput(
      requireServiceItemsObject(body.serviceItems, "serviceItems"),
    ),
  }
}

// --- Planned-payments section diff validator ---
// The §3 payment plan. Mirrors the product diff validators but throws the
// planned-payment error class so the client keys off its distinct code. Fields:
// amount (required money), direction (REVENUE|EXPENSE).

function failPlannedPaymentsDiff(message: string, field?: string): never {
  throw new TemplatePlannedPaymentExecutionError({
    code: "TEMPLATE_PLANNED_PAYMENT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

function requirePaymentsArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) failPlannedPaymentsDiff(`${path} must be an array`, path)
  return value
}

function requirePaymentsObject(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    failPlannedPaymentsDiff(`${path} must be an object`, path)
  }
  return value as Record<string, unknown>
}

// Required money field (money standard): present → valid → canonicalized. The
// domain rule additionally enforces > 0 on the use-case side.
function requireAmount(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    failPlannedPaymentsDiff(`${path} is required`, path)
  }
  if (!isValidMoneyAmount(value)) failPlannedPaymentsDiff(`${path} must be a valid amount`, path)
  return normalizeMoneyAmount(value)
}

function requireDirection(value: unknown, path: string): FlooringPaymentDirection {
  if (value === "REVENUE" || value === "EXPENSE") return value
  failPlannedPaymentsDiff(`${path} must be REVENUE or EXPENSE`, path)
}

// Nullable entity link id: null/undefined/"" = unlinked, a non-empty string =
// the linked entity. Folds missing → null (the grid always sends the field, but
// stays defensive). Referential validity is enforced by the FK (P2003), not here.
function optionalEntityId(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") failPlannedPaymentsDiff(`${field} must be a string`, field)
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function validatePlannedPaymentForm(value: unknown, path: string): TemplatePlannedPaymentForm {
  const obj = requirePaymentsObject(value, path)
  return {
    amount: requireAmount(obj.amount, `${path}.amount`),
    direction: requireDirection(obj.direction, `${path}.direction`),
    notes:
      optionalBoundedText(
        obj.notes,
        TEMPLATE_PLANNED_PAYMENT_NOTES_MAX,
        `${path}.notes`,
        failPlannedPaymentsDiff,
      ) ?? "",
    entityId: optionalEntityId(obj.entityId, `${path}.entityId`),
    // Nullable payment-purpose link — same tri-state fold; FK is the backstop.
    paymentPurposeId: optionalEntityId(obj.paymentPurposeId, `${path}.paymentPurposeId`),
  }
}

export function validateTemplatePlannedPaymentsDiffInput(
  body: Record<string, unknown>,
): TemplatePlannedPaymentsDiff {
  const added = requirePaymentsArray(body.added, "added").map((entry, idx) => {
    const obj = requirePaymentsObject(entry, `added[${idx}]`)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failPlannedPaymentsDiff),
      form: validatePlannedPaymentForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requirePaymentsArray(body.modified, "modified").map((entry, idx) => {
    const obj = requirePaymentsObject(entry, `modified[${idx}]`)
    return {
      id: requireString(obj.id, `modified[${idx}].id`, failPlannedPaymentsDiff),
      form: validatePlannedPaymentForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requirePaymentsArray(body.deleted, "deleted").map((entry, idx) => {
    const obj = requirePaymentsObject(entry, `deleted[${idx}]`)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failPlannedPaymentsDiff) }
  })

  return { added, modified, deleted }
}

// --- Entity-involvement section diff validator ---
// Why an entity is involved in the template. No required fields (the domain rule
// is a no-op) — a row may carry any combination of an entity link + a free-text
// involvement type. Fields: entityId (optional link), involvementType (bounded).
// Reuses the module-local requireArray/requireObject/optionalBoundedText helpers.

function failEntityInvolvement(message: string, field?: string): never {
  throw new TemplateEntityInvolvementExecutionError({
    code: "TEMPLATE_ENTITY_INVOLVEMENT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

// Nullable entity link id: null/undefined/"" = unlinked, a non-empty string =
// the linked entity. Folds missing → null; the FK (P2003) is the only backstop.
function optionalEntityInvolvementEntityId(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") failEntityInvolvement(`${field} must be a string`, field)
  const trimmed = (value as string).trim()
  return trimmed.length > 0 ? trimmed : null
}

function validateEntityInvolvementForm(value: unknown, path: string): TemplateEntityInvolvementForm {
  const obj = requireObject(value, path)
  return {
    entityId: optionalEntityInvolvementEntityId(obj.entityId, `${path}.entityId`),
    involvementType:
      optionalBoundedText(
        obj.involvementType,
        TEMPLATE_ENTITY_INVOLVEMENT_TYPE_MAX,
        `${path}.involvementType`,
        failEntityInvolvement,
      ) ?? "",
  }
}

export function validateTemplateEntityInvolvementsDiffInput(
  body: Record<string, unknown>,
): TemplateEntityInvolvementsDiff {
  const added = requireArray(body.added, "added").map((entry, idx) => {
    const obj = requireObject(entry, `added[${idx}]`)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failEntityInvolvement),
      form: validateEntityInvolvementForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requireArray(body.modified, "modified").map((entry, idx) => {
    const obj = requireObject(entry, `modified[${idx}]`)
    return {
      id: requireString(obj.id, `modified[${idx}].id`, failEntityInvolvement),
      form: validateEntityInvolvementForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireArray(body.deleted, "deleted").map((entry, idx) => {
    const obj = requireObject(entry, `deleted[${idx}]`)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failEntityInvolvement) }
  })

  return { added, modified, deleted }
}

// --- List view query validator (search + filters + pagination) ---

const TEMPLATES_FILTER_KEYS = [
  "entityId",
  "propertyId",
  "unitType",
  "description",
] as const
type TemplatesFilterKey = (typeof TEMPLATES_FILTER_KEYS)[number]

const listTemplatesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(LIST_TEMPLATES_MAX_PAGE_SIZE)
    .default(LIST_TEMPLATES_PAGE_SIZE),
})

// UI-exposed sortable fields. Row# (Template #) is intentionally excluded —
// createdAt is the canonical chronological key. Kept independent of the data +
// client allowlists (defense-in-depth); the allowlist-sync test holds them in step.
export const TEMPLATES_UI_SORT_FIELDS = [
  "property",
  "entity",
  "unitType",
  "createdAt",
  "updatedAt",
] as const
const TEMPLATES_MAX_SORT_LEVELS = 3

/** Parse the ordered `sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | null): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(TEMPLATES_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "desc" ? "desc" : "asc" })
    if (result.length >= TEMPLATES_MAX_SORT_LEVELS) break
  }
  return result
}

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

  const filterEntries: Array<[TemplatesFilterKey, string[]]> = TEMPLATES_FILTER_KEYS.map(
    (key) => [key, readMultiValue(searchParams, key)],
  )
  const filterRecord: Partial<TemplatesListFilters> = {}
  for (const [key, values] of filterEntries) {
    if (values.length > 0) filterRecord[key] = values
  }
  const hasAnyFilter = Object.keys(filterRecord).length > 0

  // Canonical ordered sort via `sorts`. With no sort param the list falls back to
  // the server's uniform base order (createdAt desc, id desc) — pass empty.
  const sorts = parseSortsParam(searchParams.get("sorts"))

  return {
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    filters: hasAnyFilter ? (filterRecord as TemplatesListFilters) : undefined,
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// --- Options query validator ---

// Both scopes optional: property wins, else entity scopes via the property
// relation, else the search is unscoped (lists all templates).
const templateOptionsQuerySchema = optionsQuerySchema().extend({
  propertyId: z.string().optional(),
  entityId: z.string().optional(),
})

export type ValidatedTemplateOptionsQuery = {
  search?: string
  propertyId?: string
  entityId?: string
  skip: number
  take: number
}

export function validateTemplateOptionsQuery(
  searchParams: URLSearchParams,
): ValidatedTemplateOptionsQuery {
  const parsed = parseQuery(searchParams, templateOptionsQuerySchema, failTemplate, "Invalid template options query")
  const trimmedSearch = parsed.search?.trim()
  const trimmedPropertyId = parsed.propertyId?.trim()
  const trimmedEntityId = parsed.entityId?.trim()
  return {
    search: trimmedSearch ? trimmedSearch : undefined,
    propertyId: trimmedPropertyId ? trimmedPropertyId : undefined,
    entityId: trimmedEntityId ? trimmedEntityId : undefined,
    skip: parsed.skip,
    take: parsed.take,
  }
}
