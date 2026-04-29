/**
 * Joined read shape consumed by the PDF HTML builder. The data layer
 * assembles this in `getWorkOrderForFileGeneration` (sub-sweep 7d) at
 * the moment the worker runs — no separate snapshot table; the rendered
 * PDF in the bucket IS the snapshot per locked decision #4.
 *
 * Property fields appear as live joined values (`property.streetAddress`,
 * `property.instructions`, etc.) — there is no `propertyInstructions`
 * snapshot column on the WO row anymore.
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
  // The PDF builder hides the coverage column entirely when every cut log
  // under a WOMI has no coverage value.
  coverageCut: string
  isWaste: boolean
  notes: string
  inventoryLotNumber: string
  inventoryDisplayName: string
  finalCutSequence: number | null
}

export type WorkOrderFileMaterialItemProjection = {
  id: string
  productName: string
  quantity: string
  // Send-unit snapshot from the product (suffix on the material item's
  // quantity cell).
  sendUnitName: string
  sendUnitAbbrev: string
  // Stock-unit snapshot from the product. Used to label the cut log's
  // before / cut / after cells.
  stockUnitName: string
  stockUnitAbbrev: string
  // Item-coverage-unit snapshot from the product. Empty string when the
  // product's category does not configure one (most categories). Drives
  // both the per-row coverage cell label and whether the column appears
  // at all in the cut log sub-table.
  itemCoverageUnitName: string
  itemCoverageUnitAbbrev: string
  notes: string
  cutLogs: WorkOrderFileCutLogProjection[]
}

export type WorkOrderFileGenerationInput = {
  workOrderNumber: string
  isComplete: boolean
  status: string
  scheduledFor: string
  vacancy: "VACANT" | "OCCUPIED" | null
  unitNumber: string
  unitType: string
  customAddress: string
  description: string
  instructions: string
  notes: string
  generatedAt: string
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
