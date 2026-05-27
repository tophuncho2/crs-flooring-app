/**
 * Slim joined-name + joined-property snapshot the primary section needs
 * from the saved WO. Drives read-only label rendering and seeds the
 * pickers' `selectedLabel` so the trigger shows the saved selection
 * without a server round-trip. Pass `null` from create flows.
 */
export type WorkOrderPrimaryDetail = {
  propertyId: string
  propertyName: string
  propertyStreetAddress: string
  propertyCity: string
  propertyState: string
  propertyPostalCode: string
  propertyInstructions: string
  managementCompanyId: string | null
  managementCompanyName: string | null
  templateId: string | null
  templateUnitType: string
  jobTypeId: string | null
  jobTypeName: string | null
  statusId: string | null
  statusName: string | null
  warehouseId: string | null
  warehouseName: string
}
