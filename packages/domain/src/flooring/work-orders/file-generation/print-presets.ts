import {
  WORK_ORDER_TOP_FIELD_KEYS,
  type WorkOrderPrintConfig,
  type WorkOrderTopFieldVisibility,
} from "./types.js"

/**
 * The three named starting points for the work-order print configurator. Each
 * button (Picking Ticket / Work Order Slip / Plan File) seeds the SAME
 * configurable document with one of these presets; the user then toggles
 * individual values, columns, and rows on top.
 *
 *   - pickingTicket — adjustments with full warehouse detail (Dyelot · Roll# ·
 *     Adjustment · Location)
 *   - slip          — adjustments summary (Product · Quantity only)
 *   - planFile      — requested material items
 *
 * All three start with every top-section value visible and every row selected.
 */
export type WorkOrderPrintPreset = "pickingTicket" | "slip" | "planFile"

function allTopFieldsVisible(): WorkOrderTopFieldVisibility {
  return Object.fromEntries(
    WORK_ORDER_TOP_FIELD_KEYS.map((key) => [key, true]),
  ) as WorkOrderTopFieldVisibility
}

/** Build a fresh, fully-mutable config seeded from `preset`. */
export function buildWorkOrderPrintConfig(preset: WorkOrderPrintPreset): WorkOrderPrintConfig {
  switch (preset) {
    case "pickingTicket":
      return {
        documentLabel: "Picking Ticket",
        mode: "adjustments",
        topFields: allTopFieldsVisible(),
        adjustmentColumns: { dyeLot: true, rollNumber: true, adjustment: true, location: true },
        materialColumns: { notes: true },
      }
    case "slip":
      return {
        documentLabel: "Work Order",
        mode: "adjustments",
        topFields: allTopFieldsVisible(),
        adjustmentColumns: { dyeLot: false, rollNumber: false, adjustment: false, location: false },
        materialColumns: { notes: true },
      }
    case "planFile":
      return {
        documentLabel: "Plan File",
        mode: "material",
        topFields: allTopFieldsVisible(),
        adjustmentColumns: { dyeLot: true, rollNumber: true, adjustment: true, location: true },
        materialColumns: { notes: true },
      }
  }
}
