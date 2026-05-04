/**
 * Joined read shape consumed by the PDF HTML builder. The data layer
 * assembles this in `getWorkOrderForFileGeneration` at the moment the
 * worker runs — no separate snapshot table; the rendered PDF in the
 * bucket IS the snapshot per locked decision #4.
 *
 * Property fields appear as live joined values (`property.streetAddress`,
 * `property.instructions`, etc.). Cut log inventory identity + unit
 * fields are read from the cut log row's own snapshot columns, not the
 * joined inventory or product row.
 */

export type WorkOrderFileCutLogProjection = {
  id: string
  cutLogNumber: string
  status: "PENDING" | "QUEUED" | "FINAL" | "VOID"
  isFinal: boolean
  before: string
  cut: string
  after: string
  // Empty string when the product/category has no coverage unit configured.
  // The PDF builder hides the coverage column entirely when no cut log under
  // a WOMI has either a coverage unit snapshot or a coverage value.
  coverageCut: string
  isWaste: boolean
  notes: string
  // Inventory identity columns sourced from the cut log row's snapshot
  // (NOT the joined inventory row). Empty strings for nullable schema columns.
  inventoryNumber: string
  inventoryItemNumber: string
  inventoryDyeLot: string
  // Unit snapshots from the cut log row — used as the per-cell suffix in
  // the cut log sub-table. Empty string when the snapshot is null.
  stockUnitAbbrev: string
  itemCoverageUnitAbbrev: string
  finalCutSequence: number | null
}

export type WorkOrderFileMaterialItemProjection = {
  id: string
  productName: string
  quantity: string
  // Send-unit snapshot from the WOMI row (suffix on the material item's
  // quantity cell).
  sendUnitName: string
  sendUnitAbbrev: string
  notes: string
  cutLogs: WorkOrderFileCutLogProjection[]
}

export type WorkOrderFileGenerationInput = {
  workOrderNumber: string
  scheduledFor: string
  vacancy: "VACANT" | "OCCUPIED" | null
  unitNumber: string
  unitType: string
  customAddress: string
  description: string
  instructions: string
  notes: string
  property: {
    name: string
    streetAddress: string
    city: string
    state: string
    postalCode: string
    instructions: string
  }
  managementCompanyName: string
  warehouseName: string
  jobTypeName: string
  templateNumber: string
  materialItems: WorkOrderFileMaterialItemProjection[]
}
