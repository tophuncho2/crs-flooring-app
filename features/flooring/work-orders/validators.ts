import { FlooringVacancyStatus, FlooringWorkOrderStatus, Prisma } from "@prisma/client"
import { parseDecimal, parseOptionalString, parseRequiredString } from "@/server/http/api-helpers"
import { vacancyStatuses, workOrderStatuses } from "./services"

export type WorkOrderMaterialItemInput = {
  productId: string
  linkedInventoryId: string | null
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
  changeOrderStatus: "SUFFICIENT" | "SHORTAGE"
}

export type WorkOrderServiceItemInput = {
  serviceId: string | null
  name: string | null
  unitId: string
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal | null
  notes: string | null
}

export type CreateWorkOrderInput = {
  propertyId: string | null
  templateId: string | null
  warehouseId: string | null
  status: FlooringWorkOrderStatus
  isComplete: boolean
  vacancy: FlooringVacancyStatus | null
  scheduledFor: Date | null
  unitLabel: string | null
  unitNumber: number | null
  unitType: string | null
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

function parseOptionalInt(value: unknown, field: string) {
  if (value === undefined || value === null || String(value).trim() === "") return null

  const raw = String(value).trim()
  if (!/^-?\\d+$/.test(raw)) {
    throw { message: `${field} must be a whole number`, field }
  }

  return Number(raw)
}

function asRecord(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw { message: `${field} must be an object`, field }
  }

  return value as Record<string, unknown>
}

export function validateWorkOrderMaterialItemInput(body: Record<string, unknown>): WorkOrderMaterialItemInput {
  return {
    productId: parseRequiredString(body.productId, "productId"),
    linkedInventoryId: parseOptionalString(body.linkedInventoryId),
    quantity: parseDecimal(body.quantity, "quantity", 2),
    unitPrice: body.unitPrice === undefined ? null : parseDecimal(body.unitPrice, "unitPrice", 2),
    notes: parseOptionalString(body.notes),
    changeOrderStatus:
      String(body.changeOrderStatus ?? "SUFFICIENT")
        .trim()
        .toUpperCase() === "SHORTAGE"
        ? "SHORTAGE"
        : "SUFFICIENT",
  }
}

export function validateWorkOrderServiceItemInput(body: Record<string, unknown>): WorkOrderServiceItemInput {
  return {
    serviceId: parseOptionalString(body.serviceId),
    name: parseOptionalString(body.name),
    unitId: parseRequiredString(body.unitId, "unitId"),
    quantity: parseDecimal(body.quantity, "quantity", 2),
    unitPrice: body.unitPrice === undefined ? null : parseDecimal(body.unitPrice, "unitPrice", 2),
    notes: parseOptionalString(body.notes),
  }
}

export function validateUpdateWorkOrderMaterialItemInput(body: Record<string, unknown>): UpdateWorkOrderMaterialItemInput {
  const input: UpdateWorkOrderMaterialItemInput = {}

  if ("productId" in body) input.productId = parseRequiredString(body.productId, "productId")
  if ("linkedInventoryId" in body) input.linkedInventoryId = parseOptionalString(body.linkedInventoryId)
  if ("quantity" in body) input.quantity = parseDecimal(body.quantity, "quantity", 2)
  if ("unitPrice" in body) input.unitPrice = parseDecimal(body.unitPrice, "unitPrice", 2)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)
  if ("changeOrderStatus" in body) {
    input.changeOrderStatus =
      String(body.changeOrderStatus ?? "SUFFICIENT")
        .trim()
        .toUpperCase() === "SHORTAGE"
        ? "SHORTAGE"
        : "SUFFICIENT"
  }

  return input
}

export function validateUpdateWorkOrderServiceItemInput(body: Record<string, unknown>): UpdateWorkOrderServiceItemInput {
  const input: UpdateWorkOrderServiceItemInput = {}

  if ("serviceId" in body) input.serviceId = parseOptionalString(body.serviceId)
  if ("name" in body) input.name = parseOptionalString(body.name)
  if ("unitId" in body) input.unitId = parseRequiredString(body.unitId, "unitId")
  if ("quantity" in body) input.quantity = parseDecimal(body.quantity, "quantity", 2)
  if ("unitPrice" in body) input.unitPrice = parseDecimal(body.unitPrice, "unitPrice", 2)
  if ("notes" in body) input.notes = parseOptionalString(body.notes)

  return input
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
    unitNumber: parseOptionalInt(body.unitNumber, "unitNumber"),
    unitType: parseOptionalString(body.unitType),
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
  if ("unitNumber" in body) input.unitNumber = parseOptionalInt(body.unitNumber, "unitNumber")
  if ("unitType" in body) input.unitType = parseOptionalString(body.unitType)
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
