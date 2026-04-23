export type WorkOrderListRow = {
  id: string
  workOrderNumber: string
  propertyId: string
  propertyName: string
  managementCompanyId: string | null
  managementCompanyName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  templateId: string | null
  templateNumber: string
  warehouseId: string | null
  warehouseName: string
  unitNumber: string
  unitType: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | null
  scheduledFor: string
  createdAt: string
  updatedAt: string
}

export type WorkOrderDetail = WorkOrderListRow & {
  customAddress: string
  description: string
  instructions: string
  propertyInstructions: string
  notes: string
}

export type WorkOrderOption = {
  id: string
  workOrderNumber: string
}

export type WorkOrderForm = {
  propertyId: string
  managementCompanyId: string
  jobTypeId: string
  templateId: string
  warehouseId: string
  unitNumber: string
  unitType: string
  customAddress: string
  description: string
  instructions: string
  propertyInstructions: string
  notes: string
  scheduledFor: string
  isComplete: boolean
  vacancy: "VACANT" | "OCCUPIED" | ""
}

export const EMPTY_WORK_ORDER_FORM: WorkOrderForm = {
  propertyId: "",
  managementCompanyId: "",
  jobTypeId: "",
  templateId: "",
  warehouseId: "",
  unitNumber: "",
  unitType: "",
  customAddress: "",
  description: "",
  instructions: "",
  propertyInstructions: "",
  notes: "",
  scheduledFor: "",
  isComplete: false,
  vacancy: "",
}
