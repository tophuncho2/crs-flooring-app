import type { WorkOrderDetail, WorkOrderListRow, WorkOrderOption } from "./types.js"

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
  template: { templateNumber: string } | null
  warehouseId: string | null
  warehouse: { name: string } | null
  unitNumber: string | null
  unitType: string | null
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  scheduledFor: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}

type WorkOrderDetailInput = WorkOrderListInput & {
  customAddress: string | null
  description: string | null
  instructions: string | null
  propertyInstructions: string | null
  notes: string | null
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
    templateNumber: workOrder.template?.templateNumber ?? "",
    warehouseId: workOrder.warehouseId,
    warehouseName: workOrder.warehouse?.name ?? "",
    unitNumber: workOrder.unitNumber ?? "",
    unitType: workOrder.unitType ?? "",
    isComplete: workOrder.isComplete,
    vacancy: workOrder.vacancy,
    scheduledFor: toIsoDate(workOrder.scheduledFor),
    createdAt: toIsoDate(workOrder.createdAt),
    updatedAt: toIsoDate(workOrder.updatedAt),
  }
}

export function normalizeWorkOrder(workOrder: WorkOrderDetailInput): WorkOrderDetail {
  const base = normalizeWorkOrderListRow(workOrder)
  return {
    ...base,
    customAddress: workOrder.customAddress ?? "",
    description: workOrder.description ?? "",
    instructions: workOrder.instructions ?? "",
    propertyInstructions: workOrder.propertyInstructions ?? "",
    notes: workOrder.notes ?? "",
  }
}

export function normalizeWorkOrderOption(workOrder: { id: string; workOrderNumber: string }): WorkOrderOption {
  return { id: workOrder.id, workOrderNumber: workOrder.workOrderNumber }
}
