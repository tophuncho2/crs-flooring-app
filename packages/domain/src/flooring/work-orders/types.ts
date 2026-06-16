export type WorkOrderListRow = {
  id: string
  workOrderNumber: string
  propertyId: string | null
  propertyName: string
  managementCompanyId: string | null
  managementCompanyName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  templateId: string | null
  warehouseId: string | null
  warehouseName: string
  unitNumber: string
  unitType: string
  statusId: string | null
  statusName: string | null
  vacancy: "VACANT" | "OCCUPIED" | null
  timeOfDay: "AM" | "PM" | null
  scheduledFor: string
  description: string
  createdAt: string
  updatedAt: string
}

/**
 * One page of a contact's work orders for the contact record-view Statistics
 * section, plus the contact's total labor cost (a money string, summed over ALL
 * the contact's labor payments — broader than the listed work orders).
 */
export type WorkOrdersForContactPage = {
  rows: WorkOrderListRow[]
  total: number
  laborCostTotal: string
}

export type WorkOrderDetail = WorkOrderListRow & {
  customAddress: string
  internalNotes: string
  installerInstructions: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
}

export type WorkOrderOption = {
  id: string
  workOrderNumber: string
  propertyName: string
  unitType: string
  unitNumber: string
  description: string
}

export type WorkOrderForm = {
  propertyId: string
  jobTypeId: string
  templateId: string
  warehouseId: string
  unitNumber: string
  unitType: string
  customAddress: string
  description: string
  internalNotes: string
  installerInstructions: string
  scheduledFor: string
  statusId: string
  vacancy: "VACANT" | "OCCUPIED" | ""
  timeOfDay: "AM" | "PM" | ""
}

export const EMPTY_WORK_ORDER_FORM: WorkOrderForm = {
  propertyId: "",
  jobTypeId: "",
  templateId: "",
  warehouseId: "",
  unitNumber: "",
  unitType: "",
  customAddress: "",
  description: "",
  internalNotes: "",
  installerInstructions: "",
  scheduledFor: "",
  statusId: "",
  vacancy: "",
  timeOfDay: "",
}
