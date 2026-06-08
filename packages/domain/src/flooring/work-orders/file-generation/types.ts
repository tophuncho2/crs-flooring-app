/**
 * Joined read shape consumed by the work-order HTML print builders. The
 * data layer assembles this in `getWorkOrderForFileGeneration` at the
 * moment a print view loads.
 *
 * Property fields appear as live joined values (`property.streetAddress`,
 * `property.instructions`, etc.). Inventory-adjustment identity + unit
 * fields are read from the adjustment row's own snapshot columns, not
 * the joined inventory or product row.
 *
 * Only DEDUCTION adjustments with a WO link surface here — INCREASE rows
 * are never WO-linked and the join scopes by `workOrderId`.
 */

export type WorkOrderFileAdjustmentProjection = {
  id: string
  adjustmentNumber: string
  before: string
  quantity: string
  after: string
  // Empty string when the adjustment carries no coverage value. The print
  // view always renders a "Coverage" column — empty rows just render
  // the standard "—" placeholder.
  coverage: string
  isWaste: boolean
  notes: string
  // Dye lot + roll number, read from the adjustment row's own snapshot columns
  // (NOT the joined inventory row). `rollNumber` is the bare value — the print
  // view's "Roll#" header supplies the label, so the `rollPrefix` ("ROLL#") is
  // intentionally not glued on here.
  dyeLot: string
  rollNumber: string
  // Inventory location snapshot from the adjustment row. Empty string when
  // the parent inventory had no location at the moment of the adjustment.
  location: string
  // Unit snapshots from the adjustment row — used as the per-cell suffix in
  // the print sub-table. Empty string when the snapshot is null.
  stockUnitAbbrev: string
  itemCoverageUnitAbbrev: string
}

export type WorkOrderFileMaterialItemProjection = {
  id: string
  productName: string
  quantity: string
  // Send-unit snapshot from the WOMI row (suffix on the material item's
  // quantity cell).
  sendUnitAbbrev: string
  notes: string
  inventoryAdjustments: WorkOrderFileAdjustmentProjection[]
}

export type WorkOrderFileGenerationInput = {
  workOrderNumber: string
  scheduledFor: string
  vacancy: "VACANT" | "OCCUPIED" | null
  timeOfDay: "AM" | "PM" | null
  unitNumber: string
  unitType: string
  customAddress: string
  description: string
  installerInstructions: string
  property: {
    name: string
    streetAddress: string
    city: string
    state: string
    postalCode: string
    instructions: string
  }
  managementCompanyName: string
  warehouse: {
    name: string
    streetAddress: string
    city: string
    state: string
    postalCode: string
    phone: string
  }
  jobTypeName: string
  materialItems: WorkOrderFileMaterialItemProjection[]
}
