import type {
  WorkOrderDetail,
  WorkOrderListRow,
  WorkOrderOption,
} from "./types.js"

type WorkOrderListInput = {
  id: string
  workOrderNumber: string
  propertyId: string
  property: { name: string }
  managementCompanyId: string | null
  managementCompany: { id: string; name: string } | null
  jobTypeId: string | null
  jobType: { id: string; name: string } | null
  templateId: string | null
  warehouseId: string | null
  warehouse: { name: string } | null
  unitNumber: string | null
  unitType: string | null
  isComplete: boolean
  statusId: string | null
  status: { id: string; name: string } | null
  vacancy: "VACANT" | "OCCUPIED" | null
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
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    instructions: string | null
  }
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
    propertyId: workOrder.propertyId,
    propertyName: workOrder.property.name,
    managementCompanyId: workOrder.managementCompanyId,
    managementCompanyName: workOrder.managementCompany?.name ?? null,
    jobTypeId: workOrder.jobTypeId,
    jobTypeName: workOrder.jobType?.name ?? null,
    templateId: workOrder.templateId,
    warehouseId: workOrder.warehouseId,
    warehouseName: workOrder.warehouse?.name ?? "",
    unitNumber: workOrder.unitNumber ?? "",
    unitType: workOrder.unitType ?? "",
    isComplete: workOrder.isComplete,
    statusId: workOrder.statusId,
    statusName: workOrder.status?.name ?? null,
    vacancy: workOrder.vacancy,
    scheduledFor: toIsoDate(workOrder.scheduledFor),
    description: workOrder.description ?? "",
    createdAt: toIsoDate(workOrder.createdAt),
    updatedAt: toIsoDate(workOrder.updatedAt),
  }
}

export function normalizeWorkOrder(workOrder: WorkOrderDetailInput): WorkOrderDetail {
  const base = normalizeWorkOrderListRow(workOrder)
  return {
    ...base,
    customAddress: workOrder.customAddress ?? "",
    internalNotes: workOrder.internalNotes ?? "",
    installerInstructions: workOrder.installerInstructions ?? "",
    propertyStreetAddress: workOrder.property.streetAddress ?? "",
    propertyCity: workOrder.property.city ?? "",
    propertyState: workOrder.property.state ?? "",
    propertyPostalCode: workOrder.property.postalCode ?? "",
    propertyInstructions: workOrder.property.instructions ?? "",
  }
}

export function normalizeWorkOrderOption(workOrder: {
  id: string
  workOrderNumber: string
  property: { name: string }
  unitType: string | null
  unitNumber: string | null
  description: string | null
}): WorkOrderOption {
  return {
    id: workOrder.id,
    workOrderNumber: workOrder.workOrderNumber,
    propertyName: workOrder.property.name,
    unitType: workOrder.unitType ?? "",
    unitNumber: workOrder.unitNumber ?? "",
    description: workOrder.description ?? "",
  }
}
