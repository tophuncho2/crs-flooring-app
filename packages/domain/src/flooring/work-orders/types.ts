export type WorkOrderStatus = "IDLE" | "QUEUED" | "WORKING" | "COMPLETED" | "FAILED"

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
  status: WorkOrderStatus
  vacancy: "VACANT" | "OCCUPIED" | null
  scheduledFor: string
  description: string
  createdAt: string
  updatedAt: string
}

export type WorkOrderDetail = WorkOrderListRow & {
  customAddress: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  instructions: string
  notes: string
  templateSyncedAt: string
  templateSyncMode: string
  templateSnapshotHash: string
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
  notes: "",
  scheduledFor: "",
  isComplete: false,
  vacancy: "",
}
