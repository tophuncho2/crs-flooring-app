/**
 * Slim joined-name + joined-property snapshot the primary section needs
 * from the saved WO. Drives read-only label rendering and seeds the
 * pickers' `selectedLabel` so the trigger shows the saved selection
 * without a server round-trip. Pass `null` from create flows.
 */
export type WorkOrderPrimaryDetail = {
  workOrderNumber: string
  propertyId: string | null
  propertyName: string
  // Live property instructions for the read-only preview cell. The property's
  // address is no longer surfaced here — it's snapshotted into the WO's own
  // editable address columns on pick.
  propertyInstructions: string
  entityId: string | null
  entityName: string | null
  templateId: string | null
  templateUnitType: string
  jobTypeId: string | null
  jobTypeName: string | null
  warehouseId: string | null
  warehouseName: string
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}
