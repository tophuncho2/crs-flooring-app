import { FlooringVacancyStatus, FlooringWorkOrderStatus, Prisma } from "@builders/db"
import { parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { requireNonNegativeDecimal, requirePositiveDecimal, requireServiceNameWhenCustom } from "@/features/flooring/shared/line-items/child-item-validation"
import { vacancyStatuses, workOrderStatuses } from "./services"

export type WorkOrderMaterialItemInput = {
  productId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
}

export type WorkOrderServiceItemInput = {
  serviceId: string | null
  name: string | null
  unitId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
}

export type WorkOrderSalesRepInput = {
  contactId: string
  percent: Prisma.Decimal
}

export type WorkOrderItemAllocationInput = {
  inventoryId: string
  quantity: Prisma.Decimal
  cutSize: string | null
  notes: string | null
}

export type UpdateWorkOrderItemAllocationInput = Partial<WorkOrderItemAllocationInput>

export type CreateWorkOrderInput = {
  propertyId: string | null
  templateId: string | null
  warehouseId: string | null
  status: FlooringWorkOrderStatus
  isComplete: boolean
  vacancy: FlooringVacancyStatus | null
  scheduledFor: Date | null
  unitLabel: string | null
  customAddress: string | null
  instructions: string | null
  notes: string | null
  googleDriveSlip: string | null
  googleDocUrl: string | null
  items: WorkOrderMaterialItemInput[]
  serviceItems: WorkOrderServiceItemInput[]
}

export type UpdateWorkOrderInput = Partial<Omit<CreateWorkOrderInput, "items" | "serviceItems" | "propertyId">> & {
  propertyId?: string
}
export type UpdateWorkOrderMaterialItemInput = Partial<WorkOrderMaterialItemInput>
export type UpdateWorkOrderServiceItemInput = Partial<WorkOrderServiceItemInput>
export type UpdateWorkOrderSalesRepInput = Partial<WorkOrderSalesRepInput>
export type WorkOrderMaterialSectionAllocationOperation =
  | {
      type: "create"
      input: WorkOrderItemAllocationInput
    }
  | {
      type: "update"
      allocationId: string
      expectedUpdatedAt: string
      input: UpdateWorkOrderItemAllocationInput
    }
  | {
      type: "delete"
      allocationId: string
      expectedUpdatedAt: string
    }

export type UpdateWorkOrderMaterialSectionInput = {
  item: UpdateWorkOrderMaterialItemInput
  itemExpectedUpdatedAt: string
  allocationOperations: WorkOrderMaterialSectionAllocationOperation[]
}

export type WorkOrderServiceSectionRowInput = {
  id: string | null
  expectedUpdatedAt: string | null
  item: WorkOrderServiceItemInput
}

export type UpdateWorkOrderServiceSectionInput = {
  items: WorkOrderServiceSectionRowInput[]
}

export type WorkOrderSalesRepSectionRowInput = {
  id: string | null
  expectedUpdatedAt: string | null
  item: WorkOrderSalesRepInput
}

export type UpdateWorkOrderSalesRepSectionInput = {
  items: WorkOrderSalesRepSectionRowInput[]
}

export type WorkOrderMaterialSectionRowAllocationInput = {
  id: string | null
  expectedUpdatedAt: string | null
  input: WorkOrderItemAllocationInput
}

export type WorkOrderMaterialItemsSectionRowInput = {
  id: string | null
  expectedUpdatedAt: string | null
  item: WorkOrderMaterialItemInput
  allocations: WorkOrderMaterialSectionRowAllocationInput[]
}

export type UpdateWorkOrderMaterialItemsSectionInput = {
  items: WorkOrderMaterialItemsSectionRowInput[]
}
export type SyncTemplateToWorkOrderInput = {
  templateId: string
  mode: "overwrite" | "append"
  dryRun: boolean
  expectedUpdatedAt: Date | null
}

function parseWorkOrderStatus(value: unknown, field: string) {
  const normalized = parseRequiredString(value, field)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  const mapped = {
    PENDINGEXPORT: "PENDING_EXPORT",
    EXPORTPENDING: "PENDING_EXPORT",
  }[normalized] ?? normalized

  if (!workOrderStatuses.has(mapped as (typeof FlooringWorkOrderStatus)[keyof typeof FlooringWorkOrderStatus])) {
    throw { message: `${field} must be one of ${Array.from(workOrderStatuses).join(", ")}`, field }
  }

  return mapped as FlooringWorkOrderStatus
}

function parseOptionalEnumValue(value: unknown, field: string) {
  if (value === undefined || value === null || String(value).trim() === "") return null

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")

  if (!vacancyStatuses.has(normalized as (typeof FlooringVacancyStatus)[keyof typeof FlooringVacancyStatus])) {
    throw { message: `${field} must be one of ${Array.from(vacancyStatuses).join(", ")}`, field }
  }

  return normalized as FlooringVacancyStatus
}

function parseOptionalDate(value: unknown, field: string) {
  if (value === undefined || value === null || String(value).trim() === "") return null

  const parsed = new Date(String(value).trim())
  if (Number.isNaN(parsed.getTime())) {
    throw { message: `${field} must be a valid date`, field }
  }

  return parsed
}

function asRecord(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw { message: `${field} must be an object`, field }
  }

  return value as Record<string, unknown>
}

function parseExpectedUpdatedAt(value: unknown, field: string) {
  const parsed = parseRequiredString(value, field)
  const asDate = new Date(parsed)
  if (Number.isNaN(asDate.getTime())) {
    throw { message: `${field} must be a valid ISO date`, field }
  }

  return asDate.toISOString()
}

export function validateWorkOrderMaterialItemInput(body: Record<string, unknown>): WorkOrderMaterialItemInput {
  const quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  const unitPrice = body.unitPrice === undefined ? null : requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")

  return {
    productId: parseRequiredString(body.productId, "productId"),
    quantity,
    unitPrice,
    notes: parseOptionalString(body.notes),
  }
}

export function validateWorkOrderServiceItemInput(body: Record<string, unknown>): WorkOrderServiceItemInput {
  const serviceId = parseOptionalString(body.serviceId)
  const name = parseOptionalString(body.name)
  const quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  const unitPrice = body.unitPrice === undefined ? null : requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")
  requireServiceNameWhenCustom(serviceId, name)

  return {
    serviceId,
    name,
    unitId: parseRequiredString(body.unitId, "unitId"),
    quantity,
    unitPrice,
    notes: parseOptionalString(body.notes),
  }
}

function requirePercentInRange(value: Prisma.Decimal, field: string) {
  if (value.lessThan(0) || value.greaterThan(100)) {
    throw { message: `${field} must be between 0 and 100`, field }
  }

  return value
}

export function validateWorkOrderSalesRepInput(body: Record<string, unknown>): WorkOrderSalesRepInput {
  return {
    contactId: parseRequiredString(body.contactId, "contactId"),
    percent: requirePercentInRange(parseDecimal(body.percent, "percent", 2), "percent"),
  }
}

export function validateWorkOrderItemAllocationInput(body: Record<string, unknown>): WorkOrderItemAllocationInput {
  return {
    inventoryId: parseRequiredString(body.inventoryId, "inventoryId"),
    quantity: requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity"),
    cutSize: parseOptionalString(body.cutSize),
    notes: parseOptionalString(body.notes),
  }
}

export function validateUpdateWorkOrderItemAllocationInput(body: Record<string, unknown>): UpdateWorkOrderItemAllocationInput {
  const input: UpdateWorkOrderItemAllocationInput = {}

  if ("inventoryId" in body) input.inventoryId = parseRequiredString(body.inventoryId, "inventoryId")
  if ("quantity" in body) input.quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  if ("cutSize" in body) input.cutSize = parseOptionalString(body.cutSize)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)

  return input
}

export function validateUpdateWorkOrderMaterialItemInput(body: Record<string, unknown>): UpdateWorkOrderMaterialItemInput {
  const input: UpdateWorkOrderMaterialItemInput = {}

  if ("productId" in body) input.productId = parseRequiredString(body.productId, "productId")
  if ("quantity" in body) input.quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  if ("unitPrice" in body) input.unitPrice = requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")
  if ("notes" in body) input.notes = parseOptionalString(body.notes)

  return input
}

export function validateUpdateWorkOrderServiceItemInput(body: Record<string, unknown>): UpdateWorkOrderServiceItemInput {
  const input: UpdateWorkOrderServiceItemInput = {}

  if ("serviceId" in body) input.serviceId = parseOptionalString(body.serviceId)
  if ("name" in body) input.name = parseOptionalString(body.name)
  if ("unitId" in body) input.unitId = parseRequiredString(body.unitId, "unitId")
  if ("quantity" in body) input.quantity = requirePositiveDecimal(parseDecimal(body.quantity, "quantity", 2), "quantity")
  if ("unitPrice" in body) input.unitPrice = requireNonNegativeDecimal(parseDecimal(body.unitPrice, "unitPrice", 2), "unitPrice")
  if ("notes" in body) input.notes = parseOptionalString(body.notes)
  if ("serviceId" in body && input.serviceId === null) {
    requireServiceNameWhenCustom(input.serviceId, input.name ?? null)
  }

  return input
}

export function validateUpdateWorkOrderSalesRepInput(body: Record<string, unknown>): UpdateWorkOrderSalesRepInput {
  const input: UpdateWorkOrderSalesRepInput = {}

  if ("contactId" in body) input.contactId = parseRequiredString(body.contactId, "contactId")
  if ("percent" in body) input.percent = requirePercentInRange(parseDecimal(body.percent, "percent", 2), "percent")

  return input
}

export function validateUpdateWorkOrderMaterialSectionInput(body: Record<string, unknown>): UpdateWorkOrderMaterialSectionInput {
  const allocationOperationsInput = Array.isArray(body.allocationOperations) ? body.allocationOperations : []

  return {
    item: validateUpdateWorkOrderMaterialItemInput(asRecord(body.item ?? {}, "item")),
    itemExpectedUpdatedAt: parseExpectedUpdatedAt(body.itemExpectedUpdatedAt, "itemExpectedUpdatedAt"),
    allocationOperations: allocationOperationsInput.map((operation, index) => {
      const value = asRecord(operation, `allocationOperations[${index}]`)
      const type = parseRequiredString(value.type, `allocationOperations[${index}].type`).toLowerCase()

      if (type === "create") {
        return {
          type: "create" as const,
          input: validateWorkOrderItemAllocationInput(asRecord(value.input ?? value, `allocationOperations[${index}].input`)),
        }
      }

      if (type === "update") {
        return {
          type: "update" as const,
          allocationId: parseRequiredString(value.allocationId, `allocationOperations[${index}].allocationId`),
          expectedUpdatedAt: parseExpectedUpdatedAt(
            value.expectedUpdatedAt,
            `allocationOperations[${index}].expectedUpdatedAt`,
          ),
          input: validateUpdateWorkOrderItemAllocationInput(asRecord(value.input ?? {}, `allocationOperations[${index}].input`)),
        }
      }

      if (type === "delete") {
        return {
          type: "delete" as const,
          allocationId: parseRequiredString(value.allocationId, `allocationOperations[${index}].allocationId`),
          expectedUpdatedAt: parseExpectedUpdatedAt(
            value.expectedUpdatedAt,
            `allocationOperations[${index}].expectedUpdatedAt`,
          ),
        }
      }

      throw { message: `allocationOperations[${index}].type must be create, update, or delete`, field: `allocationOperations[${index}].type` }
    }),
  }
}

function parseOptionalSectionId(value: unknown, field: string) {
  const parsed = parseOptionalString(value)
  if (!parsed) {
    return null
  }

  return parseRequiredString(parsed, field)
}

function parseOptionalExpectedUpdatedAt(value: unknown) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null
  }

  return parseExpectedUpdatedAt(value, "expectedUpdatedAt")
}

function requireExpectedUpdatedAtForExistingRow(id: string | null, expectedUpdatedAt: string | null, field: string) {
  if (id && !expectedUpdatedAt) {
    throw { message: `${field} is required for existing rows`, field }
  }
}

export function validateUpdateWorkOrderServiceSectionInput(body: Record<string, unknown>): UpdateWorkOrderServiceSectionInput {
  const items = Array.isArray(body.items) ? body.items : []

  return {
    items: items.map((item, index) => {
      const value = asRecord(item, `items[${index}]`)
      const id = parseOptionalSectionId(value.id, `items[${index}].id`)
      const expectedUpdatedAt = parseOptionalExpectedUpdatedAt(value.expectedUpdatedAt)
      requireExpectedUpdatedAtForExistingRow(id, expectedUpdatedAt, `items[${index}].expectedUpdatedAt`)

      return {
        id,
        expectedUpdatedAt,
        item: validateWorkOrderServiceItemInput(asRecord(value.item ?? value, `items[${index}].item`)),
      }
    }),
  }
}

export function validateUpdateWorkOrderSalesRepSectionInput(body: Record<string, unknown>): UpdateWorkOrderSalesRepSectionInput {
  const items = Array.isArray(body.items) ? body.items : []

  return {
    items: items.map((item, index) => {
      const value = asRecord(item, `items[${index}]`)
      const id = parseOptionalSectionId(value.id, `items[${index}].id`)
      const expectedUpdatedAt = parseOptionalExpectedUpdatedAt(value.expectedUpdatedAt)
      requireExpectedUpdatedAtForExistingRow(id, expectedUpdatedAt, `items[${index}].expectedUpdatedAt`)

      return {
        id,
        expectedUpdatedAt,
        item: validateWorkOrderSalesRepInput(asRecord(value.item ?? value, `items[${index}].item`)),
      }
    }),
  }
}

export function validateUpdateWorkOrderMaterialItemsSectionInput(
  body: Record<string, unknown>,
): UpdateWorkOrderMaterialItemsSectionInput {
  const items = Array.isArray(body.items) ? body.items : []

  return {
    items: items.map((item, index) => {
      const value = asRecord(item, `items[${index}]`)
      const id = parseOptionalSectionId(value.id, `items[${index}].id`)
      const expectedUpdatedAt = parseOptionalExpectedUpdatedAt(value.expectedUpdatedAt)
      requireExpectedUpdatedAtForExistingRow(id, expectedUpdatedAt, `items[${index}].expectedUpdatedAt`)
      const allocations = Array.isArray(value.allocations) ? value.allocations : []

      return {
        id,
        expectedUpdatedAt,
        item: validateWorkOrderMaterialItemInput(asRecord(value.item ?? value, `items[${index}].item`)),
        allocations: allocations.map((allocation, allocationIndex) => {
          const allocationValue = asRecord(allocation, `items[${index}].allocations[${allocationIndex}]`)
          const allocationId = parseOptionalSectionId(
            allocationValue.id,
            `items[${index}].allocations[${allocationIndex}].id`,
          )
          const allocationExpectedUpdatedAt = parseOptionalExpectedUpdatedAt(allocationValue.expectedUpdatedAt)
          requireExpectedUpdatedAtForExistingRow(
            allocationId,
            allocationExpectedUpdatedAt,
            `items[${index}].allocations[${allocationIndex}].expectedUpdatedAt`,
          )

          return {
            id: allocationId,
            expectedUpdatedAt: allocationExpectedUpdatedAt,
            input: validateWorkOrderItemAllocationInput(
              asRecord(
                allocationValue.input ?? allocationValue,
                `items[${index}].allocations[${allocationIndex}].input`,
              ),
            ),
          }
        }),
      }
    }),
  }
}

export function validateCreateWorkOrderInput(body: Record<string, unknown>): CreateWorkOrderInput {
  return {
    propertyId: parseOptionalString(body.propertyId),
    templateId: parseOptionalString(body.templateId),
    warehouseId: parseOptionalString(body.warehouseId),
    status: parseWorkOrderStatus(body.status ?? "BUILDING_ORDER", "status"),
    isComplete: body.isComplete === true || String(body.isComplete ?? "").trim().toLowerCase() === "true",
    vacancy: parseOptionalEnumValue(body.vacancy, "vacancy"),
    scheduledFor: parseOptionalDate(body.date, "date"),
    unitLabel: parseOptionalString(body.unitText),
    customAddress: parseOptionalString(body.customAddress),
    instructions: parseOptionalString(body.instructions),
    notes: parseOptionalString(body.notes),
    googleDriveSlip: parseOptionalString(body.workOrderImageUrl),
    googleDocUrl: parseOptionalString(body.googleDocUrl),
    items: Array.isArray(body.items) ? body.items.map((item, index) => validateWorkOrderMaterialItemInput(asRecord(item, `items[${index}]`))) : [],
    serviceItems: Array.isArray(body.serviceItems)
      ? body.serviceItems.map((item, index) => validateWorkOrderServiceItemInput(asRecord(item, `serviceItems[${index}]`)))
      : [],
  }
}

export function validateUpdateWorkOrderInput(body: Record<string, unknown>): UpdateWorkOrderInput {
  const input: UpdateWorkOrderInput = {}

  if ("propertyId" in body) input.propertyId = parseRequiredString(body.propertyId, "propertyId")
  if ("templateId" in body) input.templateId = parseOptionalString(body.templateId)
  if ("warehouseId" in body) input.warehouseId = parseOptionalString(body.warehouseId)
  if ("status" in body) input.status = parseWorkOrderStatus(body.status, "status")
  if ("isComplete" in body) input.isComplete = body.isComplete === true || String(body.isComplete ?? "").trim().toLowerCase() === "true"
  if ("vacancy" in body) input.vacancy = parseOptionalEnumValue(body.vacancy, "vacancy")
  if ("date" in body) input.scheduledFor = parseOptionalDate(body.date, "date")
  if ("unitText" in body) input.unitLabel = parseOptionalString(body.unitText)
  if ("customAddress" in body) input.customAddress = parseOptionalString(body.customAddress)
  if ("instructions" in body) input.instructions = parseOptionalString(body.instructions)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)
  if ("workOrderImageUrl" in body) input.googleDriveSlip = parseOptionalString(body.workOrderImageUrl)
  if ("googleDocUrl" in body) input.googleDocUrl = parseOptionalString(body.googleDocUrl)

  return input
}

export function validateSyncTemplateToWorkOrderInput(body: Record<string, unknown>): SyncTemplateToWorkOrderInput {
  const templateId = parseRequiredString(body.templateId, "templateId")
  const rawMode = String(body.mode ?? "overwrite")
    .trim()
    .toLowerCase()

  if (rawMode !== "overwrite" && rawMode !== "append") {
    throw { message: "mode must be one of overwrite, append", field: "mode" }
  }

  return {
    templateId,
    mode: rawMode,
    dryRun: body.dryRun === true || String(body.dryRun ?? "").trim().toLowerCase() === "true",
    expectedUpdatedAt: parseOptionalDate(body.expectedUpdatedAt, "expectedUpdatedAt"),
  }
}
