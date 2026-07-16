import {
  WORK_ORDER_TOP_FIELD_KEYS,
  type WorkOrderAdjustmentColumnVisibility,
  type WorkOrderMaterialColumnVisibility,
  type WorkOrderPrintConfig,
  type WorkOrderSectionVisibility,
  type WorkOrderTopFieldVisibility,
} from "./types.js"

/**
 * The three named starting points for the work-order print configurator. Each
 * button (Picking Ticket / Work Order Slip / Plan File) seeds the SAME
 * configurable document with one of these presets; the user then toggles
 * individual values, columns, and rows on top.
 *
 *   - pickingTicket — adjustments with full warehouse detail (Dyelot · Roll# ·
 *     Converted · Adjustment · Location · Area)
 *   - slip          — adjustments summary (Product · Quantity only)
 *   - planFile      — requested material items
 *
 * All three start with every top-section value visible and every row selected.
 */
export type WorkOrderPrintPreset = "pickingTicket" | "slip" | "planFile"

/**
 * The centered top-section labels the configurator's document-type selector
 * offers, in order. Switching the selector is label-only — it sets
 * `config.documentLabel` and nothing else (sections/columns/rows stay as the
 * user left them).
 */
export const WORK_ORDER_DOCUMENT_LABELS = ["Picking Ticket", "Work Order"] as const

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
        sections: { adjustments: true, material: false },
        topFields: allTopFieldsVisible(),
        adjustmentColumns: { dyeLot: true, rollNumber: true, converted: true, adjustment: true, location: true, area: true },
        materialColumns: { notes: true },
      }
    case "slip":
      return {
        documentLabel: "Work Order",
        sections: { adjustments: true, material: false },
        topFields: allTopFieldsVisible(),
        adjustmentColumns: { dyeLot: false, rollNumber: false, converted: false, adjustment: false, location: false, area: false },
        materialColumns: { notes: true },
      }
    case "planFile":
      return {
        documentLabel: "Plan File",
        sections: { adjustments: false, material: true },
        topFields: allTopFieldsVisible(),
        adjustmentColumns: { dyeLot: true, rollNumber: true, converted: true, adjustment: true, location: true, area: true },
        materialColumns: { notes: true },
      }
  }
}

/**
 * The persisted per-doc-type default visibilities. A PARTIAL of each visibility
 * map — this is exactly what a `FlooringWorkOrderDocumentType.printConfig` (jsonb)
 * column holds. Every map is partial so that a doc type configured before a new
 * print column existed still parses, and the missing key falls back to the code
 * base default on read (see {@link resolvePrintConfig}) — the "flows in naturally"
 * guarantee. `documentLabel` is NOT stored here; it is the doc type's `name`.
 */
export type WorkOrderStoredPrintConfig = {
  sections?: Partial<WorkOrderSectionVisibility>
  topFields?: Partial<WorkOrderTopFieldVisibility>
  adjustmentColumns?: Partial<WorkOrderAdjustmentColumnVisibility>
  materialColumns?: Partial<WorkOrderMaterialColumnVisibility>
}

/**
 * Resolve a stored (partial) doc-type config into a full, ready-to-render
 * {@link WorkOrderPrintConfig} by MERGING it over the code base-defaults
 * (`buildWorkOrderPrintConfig("pickingTicket")` — every column/top field on,
 * adjustments section on). Per-key merge means any key absent from the stored
 * config keeps its base default, so:
 *   - an empty `{}` printConfig ⇒ today's full picking-ticket defaults, and
 *   - a newly-added print column ⇒ defaults to on until an operator toggles it.
 * `documentLabel` is set to the doc type's `name` (the printed document tag).
 */
export function resolvePrintConfig(
  stored: WorkOrderStoredPrintConfig | null | undefined,
  name: string,
): WorkOrderPrintConfig {
  const base = buildWorkOrderPrintConfig("pickingTicket")
  const config = stored ?? {}
  return {
    documentLabel: name,
    sections: { ...base.sections, ...config.sections },
    topFields: { ...base.topFields, ...config.topFields },
    adjustmentColumns: { ...base.adjustmentColumns, ...config.adjustmentColumns },
    materialColumns: { ...base.materialColumns, ...config.materialColumns },
  }
}
