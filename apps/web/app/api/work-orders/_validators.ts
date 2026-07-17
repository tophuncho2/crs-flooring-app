import { z } from "zod"
import {
  WorkOrderExecutionError,
  WorkOrderMaterialItemExecutionError,
  WorkOrderPlannedPaymentExecutionError,
} from "@builders/application"
import type {
  CreateWorkOrderUseCaseInput,
  ListInput,
  ListSort,
  SyncTemplateToWorkOrderInput,
  UpdateWorkOrderUseCaseInput,
  WorkOrdersExportInput,
  WorkOrdersListFilters,
} from "@builders/application"
import {
  DEFAULT_PALETTE_COLOR,
  WORK_ORDER_EXPORT_COLUMNS,
  WO_DESCRIPTION_MAX,
  WO_INSTALLER_MAX,
  WO_INSTALLER_INSTRUCTIONS_MAX,
  WO_CUSTOMER_NAME_MAX,
  WO_INTERNAL_NOTES_MAX,
  WO_PURCHASE_ORDER_NUMBER_MAX,
  WO_RETURN_MAX,
  WO_UNIT_NUMBER_MAX,
  WO_UNIT_TYPE_MAX,
  WORK_ORDER_MATERIAL_ITEM_NOTES_MAX,
  WORK_ORDER_PLANNED_PAYMENT_NOTES_MAX,
  isValidMoneyAmount,
  normalizeMoneyAmount,
  type FlooringPaymentDirection,
  type PaletteColor,
  type WorkOrderMaterialItemCreateForm,
  type WorkOrderMaterialItemUpdateForm,
  type WorkOrderMaterialItemsDiff,
  type WorkOrderPlannedPaymentForm,
  type WorkOrderPlannedPaymentsDiff,
} from "@builders/domain"
import { parseExportEnvelope, type ExportFormat } from "@/server/http/export-request"
import {
  optionsQuerySchema,
  parseQuery,
  requireColor,
  requireString,
} from "@/app/api/_shared/validators"

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

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

// Address state — 2-letter code, upper-cased (mirrors the properties/entities
// address contract). Blank ⇒ null; a non-2-letter value 400s.
function optionalState(value: unknown, field: string): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (!trimmed) return null
  if (!/^[A-Za-z]{2}$/.test(trimmed)) failWorkOrder(`${field} must be a 2-letter state code`, field)
  return trimmed.toUpperCase()
}

// Postal code accepts either `postalCode` (canonical) or the UI's `zip` alias.
function pickPostalCode(body: Record<string, unknown>): unknown {
  if ("postalCode" in body) return body.postalCode
  if ("zip" in body) return body.zip
  return undefined
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

// Palette color. Required-with-default on create (the form always carries a
// color; a missing value falls back to the shared default rather than failing),
// and strictly validated when present on update.
function colorOrDefault(value: unknown): PaletteColor {
  if (value === undefined || value === null) return DEFAULT_PALETTE_COLOR
  return requireColor(value, "color", failWorkOrder)
}

function optionalVacancy(value: unknown): "VACANT" | "OCCUPIED" | null {
  if (value === "VACANT" || value === "OCCUPIED") return value
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
    color: colorOrDefault(body.color),
    // Property is optional — a work order always has an auto-generated number,
    // so a record is never empty even without a property.
    propertyId: optionalString(body.propertyId),
    // Warehouse is optional — a work order may be created without one.
    warehouseId: optionalString(body.warehouseId),
    templateId: optionalString(body.templateId),
    jobTypeId: optionalString(body.jobTypeId),
    unitNumber: optionalBoundedText(body.unitNumber, WO_UNIT_NUMBER_MAX, "unitNumber", failWorkOrder),
    unitType: optionalBoundedText(body.unitType, WO_UNIT_TYPE_MAX, "unitType", failWorkOrder),
    streetAddress: optionalString(body.streetAddress),
    city: optionalString(body.city),
    state: optionalState(body.state, "state"),
    postalCode: optionalString(pickPostalCode(body)),
    customerName: optionalBoundedText(body.customerName, WO_CUSTOMER_NAME_MAX, "customerName", failWorkOrder),
    description: optionalBoundedText(body.description, WO_DESCRIPTION_MAX, "description", failWorkOrder),
    installer: optionalBoundedText(body.installer, WO_INSTALLER_MAX, "installer", failWorkOrder),
    internalNotes: optionalBoundedText(body.internalNotes, WO_INTERNAL_NOTES_MAX, "internalNotes", failWorkOrder),
    installerInstructions: optionalBoundedText(
      body.installerInstructions,
      WO_INSTALLER_INSTRUCTIONS_MAX,
      "installerInstructions",
      failWorkOrder,
    ),
    purchaseOrderNumber: optionalBoundedText(
      body.purchaseOrderNumber,
      WO_PURCHASE_ORDER_NUMBER_MAX,
      "purchaseOrderNumber",
      failWorkOrder,
    ),
    return: optionalBoundedText(body.return, WO_RETURN_MAX, "return", failWorkOrder),
    scheduledFor: optionalDate(body.scheduledFor, "scheduledFor"),
    vacancy: optionalVacancy(body.vacancy),
    timeOfDay: optionalTimeOfDay(body.timeOfDay),
  }
}

export function validateUpdateWorkOrderInput(
  body: Record<string, unknown>,
): UpdateWorkOrderUseCaseInput {
  const input: UpdateWorkOrderUseCaseInput = {}

  if ("color" in body) input.color = requireColor(body.color, "color", failWorkOrder)
  if ("propertyId" in body) {
    // Property is optional and may be cleared (null).
    input.propertyId = optionalString(body.propertyId)
  }
  if ("warehouseId" in body) {
    // Warehouse is optional and may be cleared (null).
    input.warehouseId = optionalString(body.warehouseId)
  }
  if ("templateId" in body) input.templateId = optionalString(body.templateId)
  if ("jobTypeId" in body) input.jobTypeId = optionalString(body.jobTypeId)
  if ("unitNumber" in body) input.unitNumber = optionalBoundedText(body.unitNumber, WO_UNIT_NUMBER_MAX, "unitNumber", failWorkOrder)
  if ("unitType" in body) input.unitType = optionalBoundedText(body.unitType, WO_UNIT_TYPE_MAX, "unitType", failWorkOrder)
  if ("streetAddress" in body) input.streetAddress = optionalString(body.streetAddress)
  if ("city" in body) input.city = optionalString(body.city)
  if ("state" in body) input.state = optionalState(body.state, "state")
  if ("zip" in body || "postalCode" in body) input.postalCode = optionalString(pickPostalCode(body))
  if ("customerName" in body) input.customerName = optionalBoundedText(body.customerName, WO_CUSTOMER_NAME_MAX, "customerName", failWorkOrder)
  if ("description" in body) input.description = optionalBoundedText(body.description, WO_DESCRIPTION_MAX, "description", failWorkOrder)
  if ("installer" in body) input.installer = optionalBoundedText(body.installer, WO_INSTALLER_MAX, "installer", failWorkOrder)
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
  if ("purchaseOrderNumber" in body) {
    input.purchaseOrderNumber = optionalBoundedText(
      body.purchaseOrderNumber,
      WO_PURCHASE_ORDER_NUMBER_MAX,
      "purchaseOrderNumber",
      failWorkOrder,
    )
  }
  if ("return" in body) {
    input.return = optionalBoundedText(body.return, WO_RETURN_MAX, "return", failWorkOrder)
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
    // Editable unit FK (UoM epic 2C); "" = no unit.
    unitId: optionalString(obj.unitId) ?? "",
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
    // Editable unit FK (UoM epic 2C); "" = no unit.
    unitId: optionalString(obj.unitId) ?? "",
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
// Planned payments diff
// ---------------------------------------------------------------------------
// The §3 payment plan on a work order. Mirrors the templates planned-payments
// validator but throws the WO planned-payment error class so the client keys off
// its distinct code. Fields: amount (required money), direction (REVENUE|EXPENSE),
// notes (bounded), entityId (optional link).

function failPlannedPayment(message: string, field?: string): never {
  throw new WorkOrderPlannedPaymentExecutionError({
    code: "WORK_ORDER_PLANNED_PAYMENT_VALIDATION_FAILED",
    message,
    status: 400,
    field,
  })
}

// Required money field (money standard): present → valid → canonicalized. The
// domain rule additionally enforces > 0 on the use-case side.
function requirePlannedPaymentAmount(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    failPlannedPayment(`${path} is required`, path)
  }
  if (!isValidMoneyAmount(value as string)) {
    failPlannedPayment(`${path} must be a valid amount`, path)
  }
  return normalizeMoneyAmount(value as string)
}

function requirePlannedPaymentDirection(value: unknown, path: string): FlooringPaymentDirection {
  if (value === "REVENUE" || value === "EXPENSE") return value
  failPlannedPayment(`${path} must be REVENUE or EXPENSE`, path)
}

// Nullable entity link id: null/undefined/"" = unlinked, a non-empty string =
// the linked entity. Folds missing → null (the grid always sends the field, but
// stays defensive). Referential validity is enforced by the FK (P2003), not here.
function optionalPlannedPaymentEntityId(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== "string") failPlannedPayment(`${field} must be a string`, field)
  const trimmed = (value as string).trim()
  return trimmed.length > 0 ? trimmed : null
}

function validatePlannedPaymentForm(value: unknown, path: string): WorkOrderPlannedPaymentForm {
  const obj = requireObject(value, path, failPlannedPayment)
  return {
    amount: requirePlannedPaymentAmount(obj.amount, `${path}.amount`),
    direction: requirePlannedPaymentDirection(obj.direction, `${path}.direction`),
    notes:
      optionalBoundedText(
        obj.notes,
        WORK_ORDER_PLANNED_PAYMENT_NOTES_MAX,
        `${path}.notes`,
        failPlannedPayment,
      ) ?? "",
    entityId: optionalPlannedPaymentEntityId(obj.entityId, `${path}.entityId`),
    // Nullable payment-purpose link — same tri-state fold; FK is the backstop.
    paymentPurposeId: optionalPlannedPaymentEntityId(obj.paymentPurposeId, `${path}.paymentPurposeId`),
  }
}

export function validateWorkOrderPlannedPaymentsDiffInput(
  body: Record<string, unknown>,
): WorkOrderPlannedPaymentsDiff {
  const added = requireArray(body.added, "added", failPlannedPayment).map((entry, idx) => {
    const obj = requireObject(entry, `added[${idx}]`, failPlannedPayment)
    return {
      tempId: requireString(obj.tempId, `added[${idx}].tempId`, failPlannedPayment),
      form: validatePlannedPaymentForm(obj.form, `added[${idx}].form`),
    }
  })

  const modified = requireArray(body.modified, "modified", failPlannedPayment).map((entry, idx) => {
    const obj = requireObject(entry, `modified[${idx}]`, failPlannedPayment)
    return {
      id: requireString(obj.id, `modified[${idx}].id`, failPlannedPayment),
      form: validatePlannedPaymentForm(obj.form, `modified[${idx}].form`),
    }
  })

  const deleted = requireArray(body.deleted, "deleted", failPlannedPayment).map((entry, idx) => {
    const obj = requireObject(entry, `deleted[${idx}]`, failPlannedPayment)
    return { id: requireString(obj.id, `deleted[${idx}].id`, failPlannedPayment) }
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
  "entityId",
  "propertyId",
  "templateId",
  "warehouseId",
  "jobTypeId",
] as const

type IdFilterKey = (typeof ID_FILTER_KEYS)[number]

// scheduledFor range bounds — single-value `YYYY-MM-DD` filters.
const DATE_FILTER_KEYS = ["scheduledForStart", "scheduledForEnd"] as const
type DateFilterKey = (typeof DATE_FILTER_KEYS)[number]
const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Per-column identity search — the list-view search bars. Each is a single
// free-text value carried as a one-element array (same contract as the date
// bounds), applied server-side as a case-insensitive ILIKE on its own column.
const TEXT_FILTER_KEYS = [
  "unitType",
  "unitNumber",
  "workOrderNumber",
  "description",
  "purchaseOrderNumber",
  "streetAddress",
  "city",
  "postalCode",
] as const
type TextFilterKey = (typeof TEXT_FILTER_KEYS)[number]

// Vacancy enum filter — single-select, carried as a one-element array. Invalid
// list-filter values are dropped (filter off) rather than 400'd. (Note: the
// vacancy *field* is required on create/update via `requiredVacancy`; this is
// only the read-side filter.)
const VACANCY_VALUES = ["VACANT", "OCCUPIED"] as const

const listWorkOrdersQuerySchema = z.object({
  // Legacy single-sort pair — kept so old bookmarked links still resolve. The
  // canonical input is the ordered `sorts` param, parsed separately below.
  sort: z.enum(["asc", "desc"]).default("desc"),
  sortField: z
    .enum(["createdAt", "scheduledFor", "property", "entity", "workOrderNumber"])
    .default("createdAt"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(WORK_ORDERS_LIST_MAX_PAGE_SIZE)
    .default(WORK_ORDERS_LIST_DEFAULT_PAGE_SIZE),
})

// UI-exposed sortable fields. `workOrderNumber` is intentionally excluded (WO#
// is never user-sortable; createdAt is the canonical chronological key).
export const WORK_ORDERS_UI_SORT_FIELDS = [
  "createdAt",
  "updatedAt",
  "scheduledFor",
  "timeOfDay",
  "property",
  "entity",
  "warehouse",
  "jobType",
] as const
const WORK_ORDERS_MAX_SORT_LEVELS = 3

/** Parse the ordered `sorts=field:dir,field:dir` param (validated, deduped, capped). */
function parseSortsParam(raw: string | null): ListSort[] {
  if (!raw) return []
  const allowed = new Set<string>(WORK_ORDERS_UI_SORT_FIELDS)
  const result: ListSort[] = []
  const seen = new Set<string>()
  for (const token of raw.split(",")) {
    const [field, direction] = token.split(":")
    if (!field || seen.has(field) || !allowed.has(field)) continue
    seen.add(field)
    result.push({ field, direction: direction === "asc" ? "asc" : "desc" })
    if (result.length >= WORK_ORDERS_MAX_SORT_LEVELS) break
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
    "state",
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
  // State address filter — exact 2-letter `IN` match. Upper-cased + gated to
  // valid 2-letter codes (mirrors the properties list filter); junk drops out.
  const stateCodes = Array.from(
    new Set(
      readMultiValue(searchParams, "state")
        .map((entry) => entry.toUpperCase())
        .filter((entry) => /^[A-Z]{2}$/.test(entry)),
    ),
  )
  if (stateCodes.length > 0) filterRecord.state = stateCodes
  for (const key of DATE_FILTER_KEYS) {
    const value = readMultiValue(searchParams, key)[0]
    if (!value) continue
    if (!DATE_ONLY_PATTERN.test(value)) {
      failWorkOrder(`${key} must be a YYYY-MM-DD date`, key)
    }
    filterRecord[key as DateFilterKey] = [value]
  }

  const hasAnyFilter = Object.keys(filterRecord).length > 0

  // Canonical ordered sort via `sorts`; else honor a legacy `?sortField=` bookmark
  // when present. With NO sort params the list falls back to the server's uniform
  // base order (createdAt desc, id desc) — pass empty so nothing reads as sorted.
  const parsedSorts = parseSortsParam(searchParams.get("sorts"))
  const sorts: ListSort[] =
    parsedSorts.length > 0
      ? parsedSorts
      : searchParams.has("sortField")
        ? [{ field: parsed.sortField, direction: parsed.sort }]
        : []

  return {
    ...(sorts.length > 0 ? { sort: sorts[0], sorts } : {}),
    ...(hasAnyFilter ? { filters: filterRecord } : {}),
    page: parsed.page,
    pageSize: parsed.pageSize,
  }
}

// ---------------------------------------------------------------------------
// CSV export request validator (list query + ticked ids + columns + cap)
// ---------------------------------------------------------------------------

const WORK_ORDER_EXPORT_COLUMN_KEYS: ReadonlySet<string> = new Set(
  WORK_ORDER_EXPORT_COLUMNS.map((column) => column.key),
)

export type ValidatedWorkOrdersExport = {
  input: WorkOrdersExportInput
  /** Picked column keys, whitelisted; `undefined` ⇒ all columns. */
  columns?: string[]
  /** Delivery target — Google Sheet (default) or CSV download. */
  format: ExportFormat
}

/**
 * Validate a work-order CSV-export POST body. Reuses {@link validateListWorkOrdersQuery}
 * on the embedded `query` so the export scopes exactly like the list, then
 * layers the ticked `ids`, picked `columns`, and row `cap` on top.
 */
export function validateWorkOrdersExportRequest(body: unknown): ValidatedWorkOrdersExport {
  const envelope = parseExportEnvelope(body, WORK_ORDER_EXPORT_COLUMN_KEYS)
  const listInput = validateListWorkOrdersQuery(new URLSearchParams(envelope.query))

  return {
    input: {
      ...(listInput.filters ? { filters: listInput.filters } : {}),
      ...(listInput.sort ? { sort: listInput.sort } : {}),
      ...(listInput.sorts ? { sorts: listInput.sorts } : {}),
      ...(envelope.ids ? { ids: envelope.ids } : {}),
      ...(envelope.cap !== undefined ? { cap: envelope.cap } : {}),
    },
    ...(envelope.columns ? { columns: envelope.columns } : {}),
    format: envelope.format,
  }
}

// ---------------------------------------------------------------------------
// Picker / options search validators (adjustment relink dropdowns)
// ---------------------------------------------------------------------------

const workOrderOptionsSearchQuerySchema = optionsQuerySchema()

export type ValidatedWorkOrderOptionsSearchQuery = {
  search?: string
  skip: number
  take: number
}

export function validateWorkOrderOptionsSearchQuery(
  searchParams: URLSearchParams,
): ValidatedWorkOrderOptionsSearchQuery {
  const parsed = parseQuery(searchParams, workOrderOptionsSearchQuerySchema, failWorkOrder, "Invalid work-order options query")
  const trimSearch = parsed.search?.trim()
  return {
    ...(trimSearch ? { search: trimSearch } : {}),
    skip: parsed.skip,
    take: parsed.take,
  }
}

// --- Print-event recorder (fired by the print configurator's Print button) ---

export type ValidatedRecordWorkOrderPrintEvent = {
  documentTypeId: string
  documentTypeName: string
}

export function validateRecordWorkOrderPrintEventInput(
  body: Record<string, unknown>,
): ValidatedRecordWorkOrderPrintEvent {
  return {
    documentTypeId: requireString(body.documentTypeId, "documentTypeId", failWorkOrder),
    documentTypeName: requireString(body.documentTypeName, "documentTypeName", failWorkOrder),
  }
}
