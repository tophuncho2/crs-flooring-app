import { DEFAULT_PALETTE_COLOR, type PaletteColor } from "../shared/palette.js"

export type WorkOrderListRow = {
  id: string
  workOrderNumber: string
  color: PaletteColor
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
  customerName: string
  description: string
  installer: string
  // WO-owned address (snapshotted from the property, then editable). `zip` vocab
  // matches the form + shared AddressEditCell; persisted as `postalCode`. On the
  // list row so the table can display + search the address columns.
  streetAddress: string
  city: string
  state: string
  zip: string
  purchaseOrderNumber: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
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
  // streetAddress / city / state / zip now live on WorkOrderListRow (the list
  // displays + searches them); the detail inherits them.
  internalNotes: string
  installerInstructions: string
  // Live property instructions for the record-view read-only preview cell. The
  // property's address is snapshotted into the WO-owned columns above (on pick),
  // so the joined address is no longer carried on the detail.
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
  color: PaletteColor
  propertyId: string
  jobTypeId: string
  templateId: string
  warehouseId: string
  unitNumber: string
  unitType: string
  streetAddress: string
  city: string
  state: string
  zip: string
  customerName: string
  description: string
  internalNotes: string
  installer: string
  installerInstructions: string
  purchaseOrderNumber: string
  scheduledFor: string
  vacancy: "VACANT" | "OCCUPIED" | ""
  timeOfDay: "AM" | "PM" | ""
}

export const EMPTY_WORK_ORDER_FORM: WorkOrderForm = {
  color: DEFAULT_PALETTE_COLOR,
  propertyId: "",
  jobTypeId: "",
  templateId: "",
  warehouseId: "",
  unitNumber: "",
  unitType: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  customerName: "",
  description: "",
  internalNotes: "",
  installer: "",
  installerInstructions: "",
  purchaseOrderNumber: "",
  scheduledFor: "",
  vacancy: "",
  timeOfDay: "",
}
