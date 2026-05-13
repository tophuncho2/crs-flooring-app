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
  before: string
  cut: string
  after: string
  // Empty string when the cut log carries no coverage value. The PDF
  // always renders a "Coverage Cut" column — empty rows just render
  // the standard "—" placeholder.
  coverageCut: string
  isWaste: boolean
  notes: string
  // Inventory identity sourced from the cut log row's snapshot
  // (NOT the joined inventory row). The denormalized `inventoryItem` column
  // already encodes `inv# · roll# · dyeLot · note` — render directly.
  inventoryItem: string
  // Inventory location snapshot from the cut log row. Empty string when the
  // parent inventory has no location set at the moment of the cut.
  location: string
  // Unit snapshots from the cut log row — used as the per-cell suffix in
  // the cut log sub-table. Empty string when the snapshot is null.
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
