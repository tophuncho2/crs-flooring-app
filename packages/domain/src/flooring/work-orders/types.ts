export type WorkOrderListRow = {
  id: string
  workOrderNumber: string
  propertyId: string | null
  propertyName: string
  entityId: string | null
  entityName: string | null
  jobTypeId: string | null
  jobTypeName: string | null
  templateId: string | null
  warehouseId: string | null
  warehouseName: string
  unitNumber: string
  unitType: string
  vacancy: "VACANT" | "OCCUPIED" | null
  timeOfDay: "AM" | "PM" | null
  scheduledFor: string
  description: string
  createdAt: string
  updatedAt: string
}

/**
 * An adjacent work order in the global work-order-number sequence
 * (`workOrderNumberInt`). Carries only `id` — the record-view stepper navigates
 * straight to the neighbor record by number. Null at the ends of the sequence.
 */
export type WorkOrderNeighbor = {
  id: string
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
  /**
   * Neighbors by global work-order-number order (`workOrderNumberInt`), ignoring
   * any list filters — powers the record-view shell stepper (◀ WO-# ▶). Null
   * when the current row is at the start/end of the sequence.
   */
  previousWorkOrder: WorkOrderNeighbor | null
  nextWorkOrder: WorkOrderNeighbor | null
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
  vacancy: "",
  timeOfDay: "",
}
