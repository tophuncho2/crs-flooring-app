import type {
  WorkOrderFileAdjustmentProjection,
  WorkOrderFileGenerationInput,
  WorkOrderFileMaterialItemProjection,
} from "../../../../src/flooring/work-orders/file-generation/types.js"

// Em-dash placeholder emitted by `escapeOrEmpty` / `renderUnitValue` for blank
// values. Kept as a named constant so assertions don't depend on pasting the
// exact U+2014 glyph.
export const EMPTY_CELL = '<span class="empty-cell">—</span>'

const BASE: WorkOrderFileGenerationInput = {
  workOrderNumber: "WO-1001",
  scheduledFor: "2026-06-08",
  vacancy: "VACANT",
  timeOfDay: "AM",
  unitNumber: "12B",
  unitType: "2 Bed / 1 Bath",
  customAddress: "",
  description: "",
  installerInstructions: "",
  property: {
    name: "Maple Court Apartments",
    streetAddress: "100 Maple St",
    city: "Austin",
    state: "TX",
    postalCode: "78701",
    instructions: "",
  },
  managementCompanyName: "Cardinal Management",
  warehouse: {
    name: "North Warehouse",
    streetAddress: "5 Depot Rd",
    city: "Round Rock",
    state: "TX",
    postalCode: "78664",
    phone: "512-555-0100",
  },
  jobTypeName: "Turn",
  materialItems: [],
}

/**
 * Fully-populated, valid `WorkOrderFileGenerationInput` for the file-generation
 * tests. Top-level keys are shallow-overridden; `property` and `warehouse` are
 * deep-merged so a case can override a single nested field without restating the
 * whole object. `materialItems` defaults to `[]` (the adjustments table is out
 * of scope for the above-the-table suite).
 */
export function makeFileGenInput(
  overrides: Partial<Omit<WorkOrderFileGenerationInput, "property" | "warehouse">> & {
    property?: Partial<WorkOrderFileGenerationInput["property"]>
    warehouse?: Partial<WorkOrderFileGenerationInput["warehouse"]>
  } = {},
): WorkOrderFileGenerationInput {
  const { property, warehouse, ...rest } = overrides
  return {
    ...BASE,
    ...rest,
    property: { ...BASE.property, ...property },
    warehouse: { ...BASE.warehouse, ...warehouse },
  }
}

/** Minimal adjustment row — only needed so the adjustments table renders at all. */
export function makeAdjustment(
  overrides: Partial<WorkOrderFileAdjustmentProjection> = {},
): WorkOrderFileAdjustmentProjection {
  return {
    id: "adj-1",
    adjustmentNumber: "ADJ-1",
    before: "100",
    quantity: "10",
    after: "90",
    coverage: "120",
    isWaste: false,
    notes: "",
    dyeLot: "",
    rollNumber: "",
    location: "A-1",
    stockUnitAbbrev: "rolls",
    itemCoverageUnitAbbrev: "sf",
    ...overrides,
  }
}

/** Minimal material item carrying one adjustment, for cases that need the table present. */
export function makeMaterialItem(
  overrides: Partial<WorkOrderFileMaterialItemProjection> = {},
): WorkOrderFileMaterialItemProjection {
  return {
    id: "item-1",
    productName: "Shaw Carpet — Beige",
    quantity: "10",
    sendUnitAbbrev: "rolls",
    notes: "",
    inventoryAdjustments: [makeAdjustment()],
    ...overrides,
  }
}
