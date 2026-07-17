import type {
  WorkOrderFileAdjustmentProjection,
  WorkOrderFileGenerationInput,
  WorkOrderFileMaterialItemProjection,
  WorkOrderFileProductAdjustmentGroup,
  WorkOrderFileProductMaterialItemGroup,
} from "../../../src/work-orders/file-generation/types.js"

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
  streetAddress: "100 Maple St",
  city: "Austin",
  state: "TX",
  postalCode: "78701",
  customerName: "",
  description: "",
  installer: "",
  installerInstructions: "",
  return: "",
  property: {
    name: "Maple Court Apartments",
    instructions: "",
  },
  entityName: "Cardinal Management",
  warehouse: {
    name: "North Warehouse",
    streetAddress: "5 Depot Rd",
    city: "Round Rock",
    state: "TX",
    postalCode: "78664",
    phone: "512-555-0100",
  },
  jobTypeName: "Turn",
  adjustmentGroups: [],
  materialItemGroups: [],
}

/**
 * Fully-populated, valid `WorkOrderFileGenerationInput` for the file-generation
 * tests. Top-level keys are shallow-overridden; `property` and `warehouse` are
 * deep-merged. The adjustments table groups by product — a case supplies its
 * product groups via `adjustmentGroups` (or the legacy `materialItems` alias,
 * one group per material item). Defaults to `[]` (table out of scope for the
 * above-the-table suite).
 */
export function makeFileGenInput(
  overrides: Partial<Omit<WorkOrderFileGenerationInput, "property" | "warehouse">> & {
    property?: Partial<WorkOrderFileGenerationInput["property"]>
    warehouse?: Partial<WorkOrderFileGenerationInput["warehouse"]>
    /** Legacy alias — one group per "material item". */
    materialItems?: WorkOrderFileProductAdjustmentGroup[]
  } = {},
): WorkOrderFileGenerationInput {
  const { property, warehouse, materialItems, adjustmentGroups, ...rest } = overrides
  return {
    ...BASE,
    ...rest,
    property: { ...BASE.property, ...property },
    warehouse: { ...BASE.warehouse, ...warehouse },
    adjustmentGroups: adjustmentGroups ?? materialItems ?? BASE.adjustmentGroups,
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
    isWaste: false,
    notes: "",
    dyeLot: "",
    rollNumber: "",
    location: "A-1",
    area: "",
    unitAbbrev: "rolls",
    convertedBalance: "",
    conversionUnitAbbrev: "",
    ...overrides,
  }
}

/**
 * Minimal product group carrying one adjustment, for cases that need the table
 * present. Named `makeMaterialItem` (and accepts the legacy `inventoryAdjustments`
 * key) since each print group used to be a material item's adjustments — now it
 * is the adjustment's own product group. Extra legacy keys (`id`, `quantity`,
 * `unitAbbrev`) are accepted and ignored.
 */
export function makeMaterialItem(
  overrides: {
    productName?: string
    adjustments?: WorkOrderFileAdjustmentProjection[]
    inventoryAdjustments?: WorkOrderFileAdjustmentProjection[]
    id?: string
    quantity?: string
    unitAbbrev?: string
    notes?: string
  } = {},
): WorkOrderFileProductAdjustmentGroup {
  return {
    productName: overrides.productName ?? "Shaw Carpet — Beige",
    adjustments: overrides.adjustments ?? overrides.inventoryAdjustments ?? [makeAdjustment()],
  }
}

/** Minimal requested-material-item row for the Plan File table. */
export function makeMaterialItemRow(
  overrides: Partial<WorkOrderFileMaterialItemProjection> = {},
): WorkOrderFileMaterialItemProjection {
  return {
    id: "mi-1",
    quantity: "10",
    unitAbbrev: "SF",
    notes: "",
    ...overrides,
  }
}

/** Minimal material-item product group carrying one item, for table-present cases. */
export function makeMaterialItemGroup(
  overrides: {
    productName?: string
    materialItems?: WorkOrderFileMaterialItemProjection[]
  } = {},
): WorkOrderFileProductMaterialItemGroup {
  return {
    productName: overrides.productName ?? "Shaw Carpet — Beige",
    materialItems: overrides.materialItems ?? [makeMaterialItemRow()],
  }
}
