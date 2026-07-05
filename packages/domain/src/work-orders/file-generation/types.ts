/**
 * Joined read shape consumed by the work-order HTML print builders. The
 * data layer assembles this in `getWorkOrderForFileGeneration` at the
 * moment a print view loads.
 *
 * The printed address line is built from the WO-owned address columns
 * (`streetAddress`/`city`/`state`/`postalCode`, snapshotted from the property
 * at pick time then editable); `property.name`/`property.instructions` remain
 * live joined values. Inventory-adjustment identity + unit fields are read from
 * the adjustment row's own snapshot columns, not the joined inventory or
 * product row.
 *
 * Only DEDUCTION adjustments surface here — the join scopes by `workOrderId`
 * and filters to DEDUCTION. Adjustments are grouped by their OWN product
 * snapshot (they no longer link to a material item).
 */

export type WorkOrderFileAdjustmentProjection = {
  id: string
  adjustmentNumber: string
  before: string
  quantity: string
  after: string
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
  // Unit abbrev for the per-cell suffix in the print sub-table. Derives solely
  // from the adjustment's own unit FK join (UoM epic 2B); no snapshot fallback.
  // Empty string when the unit is unresolved.
  unitAbbrev: string
}

/**
 * A product group of DEDUCTION adjustments on the work order. Grouped by the
 * adjustment's own product snapshot — there is no material-item link. Drives
 * one product block (rows + subtotal + divider) in the print adjustments table.
 */
export type WorkOrderFileProductAdjustmentGroup = {
  productName: string
  adjustments: WorkOrderFileAdjustmentProjection[]
}

/**
 * A single requested material item on the work order, projected for the
 * "Plan File" print view. `unitAbbrev` is the item's live unit-rel abbreviation
 * (empty string when the unit is null); `notes` the item's free-text note (empty when blank).
 */
export type WorkOrderFileMaterialItemProjection = {
  id: string
  quantity: string
  unitAbbrev: string
  notes: string
}

/**
 * A product group of requested material items on the work order, grouped by the
 * item's product (composed display name), mirroring the adjustment grouping.
 * Drives one product block (rows + subtotal + divider) in the Requested
 * Materials print table.
 */
export type WorkOrderFileProductMaterialItemGroup = {
  productName: string
  materialItems: WorkOrderFileMaterialItemProjection[]
}

/**
 * The top-section values a user can toggle on the print configurator, in render
 * order. This is the single source the configurator's checkbox panel and
 * {@link renderWorkOrderInfo} both key off — adding a key here surfaces a
 * checkbox AND gates its cell/row.
 */
export const WORK_ORDER_TOP_FIELD_KEYS = [
  "date",
  "warehouse",
  "jobType",
  "description",
  "entity",
  "property",
  "customerName",
  "propertyAddress",
  "propertyInstructions",
  "installer",
  "installerInstructions",
  "unitType",
  "unitNumber",
  "vacancy",
] as const

export type WorkOrderTopFieldKey = (typeof WORK_ORDER_TOP_FIELD_KEYS)[number]

/** Human labels for the top-section checkboxes, keyed by {@link WorkOrderTopFieldKey}. */
export const WORK_ORDER_TOP_FIELD_LABELS: Record<WorkOrderTopFieldKey, string> = {
  date: "Date",
  warehouse: "Warehouse",
  jobType: "Job Type",
  description: "Description",
  entity: "Entity",
  property: "Property",
  customerName: "Customer Name",
  propertyAddress: "Address",
  propertyInstructions: "Property Instructions",
  installer: "Installer",
  installerInstructions: "Installer Instructions",
  unitType: "Unit Type",
  unitNumber: "Unit Number",
  vacancy: "Vacancy",
}

/** Which top-section values render. `true` ⇒ shown. */
export type WorkOrderTopFieldVisibility = Record<WorkOrderTopFieldKey, boolean>

/**
 * Optional adjustment columns (Product + Quantity are always shown). Mirrors the
 * old `includeInventoryDetail` boolean, split into independent toggles so the
 * configurator can show any subset.
 */
export type WorkOrderAdjustmentColumnVisibility = {
  dyeLot: boolean
  rollNumber: boolean
  adjustment: boolean
  location: boolean
}

/** Optional material columns (Product + Qty/Unit are always shown). */
export type WorkOrderMaterialColumnVisibility = {
  notes: boolean
}

/**
 * The full checkbox-driven configuration for ONE work-order print document.
 * Seeded from a preset (Picking Ticket / Slip / Plan File) and then mutated by
 * the configurator's checkboxes. `mode` is the mutually-exclusive bottom section
 * (adjustments XOR requested material). `selected*Ids` undefined ⇒ all rows.
 */
export type WorkOrderPrintConfig = {
  documentLabel: string
  mode: "adjustments" | "material"
  topFields: WorkOrderTopFieldVisibility
  adjustmentColumns: WorkOrderAdjustmentColumnVisibility
  materialColumns: WorkOrderMaterialColumnVisibility
  selectedAdjustmentIds?: ReadonlyArray<string>
  selectedMaterialIds?: ReadonlyArray<string>
}

export type WorkOrderFileGenerationInput = {
  workOrderNumber: string
  scheduledFor: string
  vacancy: "VACANT" | "OCCUPIED" | null
  timeOfDay: "AM" | "PM" | null
  unitNumber: string
  unitType: string
  // WO-owned address (snapshotted from the property on pick, then editable).
  // The printed Address line is built from these — `customAddress` is retired.
  streetAddress: string
  city: string
  state: string
  postalCode: string
  customerName: string
  description: string
  installer: string
  installerInstructions: string
  property: {
    name: string
    instructions: string
  }
  entityName: string
  warehouse: {
    name: string
    streetAddress: string
    city: string
    state: string
    postalCode: string
    phone: string
  }
  jobTypeName: string
  adjustmentGroups: WorkOrderFileProductAdjustmentGroup[]
  materialItemGroups: WorkOrderFileProductMaterialItemGroup[]
}
