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
  cut: string
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
  sendUnitName: string
  sendUnitAbbrev: string
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
