import type { PaletteColor } from "../../shared/palette.js"
import type {
  WorkOrderDetail,
  WorkOrderListRow,
  WorkOrderNeighbor,
  WorkOrderOption,
} from "./types.js"

type WorkOrderNeighbors = {
  previousWorkOrder: WorkOrderNeighbor | null
  nextWorkOrder: WorkOrderNeighbor | null
}

const NO_WORK_ORDER_NEIGHBORS: WorkOrderNeighbors = {
  previousWorkOrder: null,
  nextWorkOrder: null,
}

type WorkOrderListInput = {
  id: string
  workOrderNumber: string
  color: PaletteColor
  propertyId: string | null
  property: { name: string; entity: { id: string; entity: string } | null } | null
  jobTypeId: string | null
  jobType: { id: string; name: string } | null
  templateId: string | null
  warehouseId: string | null
  warehouse: { name: string } | null
  unitNumber: string | null
  unitType: string | null
  vacancy: "VACANT" | "OCCUPIED" | null
  timeOfDay: "AM" | "PM" | null
  scheduledFor: Date | string | null
  description: string | null
  createdAt: Date | string
  updatedAt: Date | string
}

type WorkOrderDetailInput = WorkOrderListInput & {
  customAddress: string | null
  internalNotes: string | null
  installerInstructions: string | null
  property: {
    name: string
    entity: { id: string; entity: string } | null
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    instructions: string | null
  } | null
}

function toIsoDate(value: Date | string | null): string {
  if (value === null) return ""
  if (value instanceof Date) return value.toISOString()
  return value
}

export function normalizeWorkOrderListRow(workOrder: WorkOrderListInput): WorkOrderListRow {
  return {
    id: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber,
    color: workOrder.color,
    propertyId: workOrder.propertyId,
    propertyName: workOrder.property?.name ?? "",
    entityId: workOrder.property?.entity?.id ?? null,
    entityName: workOrder.property?.entity?.entity ?? null,
    jobTypeId: workOrder.jobTypeId,
    jobTypeName: workOrder.jobType?.name ?? null,
    templateId: workOrder.templateId,
    warehouseId: workOrder.warehouseId,
    warehouseName: workOrder.warehouse?.name ?? "",
    unitNumber: workOrder.unitNumber ?? "",
    unitType: workOrder.unitType ?? "",
    vacancy: workOrder.vacancy,
    timeOfDay: workOrder.timeOfDay,
    scheduledFor: toIsoDate(workOrder.scheduledFor),
    description: workOrder.description ?? "",
    createdAt: toIsoDate(workOrder.createdAt),
    updatedAt: toIsoDate(workOrder.updatedAt),
  }
}

export function normalizeWorkOrder(
  workOrder: WorkOrderDetailInput,
  neighbors: WorkOrderNeighbors = NO_WORK_ORDER_NEIGHBORS,
): WorkOrderDetail {
  const base = normalizeWorkOrderListRow(workOrder)
  return {
    ...base,
    customAddress: workOrder.customAddress ?? "",
    internalNotes: workOrder.internalNotes ?? "",
    installerInstructions: workOrder.installerInstructions ?? "",
    propertyStreetAddress: workOrder.property?.streetAddress ?? "",
    propertyCity: workOrder.property?.city ?? "",
    propertyState: workOrder.property?.state ?? "",
    propertyPostalCode: workOrder.property?.postalCode ?? "",
    propertyInstructions: workOrder.property?.instructions ?? "",
    previousWorkOrder: neighbors.previousWorkOrder,
    nextWorkOrder: neighbors.nextWorkOrder,
  }
}

export function normalizeWorkOrderOption(workOrder: {
  id: string
  workOrderNumber: string
  property: { name: string } | null
  unitType: string | null
  unitNumber: string | null
  description: string | null
}): WorkOrderOption {
  return {
    id: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber,
    propertyName: workOrder.property?.name ?? "",
    unitType: workOrder.unitType ?? "",
    unitNumber: workOrder.unitNumber ?? "",
    description: workOrder.description ?? "",
  }
}
