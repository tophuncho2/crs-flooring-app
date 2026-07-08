import { toCsv, type ExportColumn } from "../../shared/csv.js"
import {
  WORK_ORDER_TOP_FIELD_KEYS,
  WORK_ORDER_TOP_FIELD_LABELS,
  type WorkOrderFileAdjustmentProjection,
  type WorkOrderFileGenerationInput,
  type WorkOrderFileMaterialItemProjection,
  type WorkOrderPrintConfig,
} from "./types.js"
import { formatTransition, formatUnitValue, resolveWorkOrderTopFieldValue } from "./csv-values.js"

/**
 * The checkbox-driven work-order CSV export — the spreadsheet sibling of
 * {@link import("./build-work-order-print-html.js").buildWorkOrderPrintHtml}.
 * Given the SAME {@link WorkOrderFileGenerationInput} + {@link WorkOrderPrintConfig}
 * the configurator drives the print preview with, it emits stacked CSV blocks:
 *
 *   1. the top section — one `Field,Value` row per CHECKED top field, then
 *   2. each bottom section `config.sections` enables (either, both, or neither) —
 *      the DEDUCTION adjustments and/or the requested material, each a labeled,
 *      column-D-indented table with its toggled columns + selected rows.
 *
 * Row selection (`selected*Ids`) and column visibility mirror the print output
 * exactly, so the file matches what is on screen. Per-group subtotal rows are
 * intentionally omitted (a spreadsheet sums itself). Pure — reuses the shared
 * {@link toCsv} serializer (UTF-8 BOM once, at the file start) and the same value
 * resolvers the print builders use, so the two surfaces never diverge.
 */
export function buildWorkOrderCsv(
  input: WorkOrderFileGenerationInput,
  config: WorkOrderPrintConfig,
): string {
  // Top field block first, BOM on it so Excel decodes the whole file as UTF-8.
  const parts = [toCsv(buildTopFieldRows(input, config), TOP_FIELD_COLUMNS, { bom: true })]
  // Each enabled bottom section becomes its own labeled, column-D-indented table.
  // The column-A label disambiguates the two Product-columned tables.
  if (config.sections.adjustments) {
    parts.push(`Adjustments\r\n${toCsv(selectAdjustmentRows(input, config), buildAdjustmentColumns(config))}`)
  }
  if (config.sections.material) {
    parts.push(
      `Requested Material\r\n${toCsv(selectMaterialRows(input, config), buildMaterialColumns(config))}`,
    )
  }
  // Blank line (CRLF + CRLF) between stacked blocks.
  return parts.join("\r\n\r\n")
}

type TopFieldRow = { field: string; value: string }

const TOP_FIELD_COLUMNS: ReadonlyArray<ExportColumn<TopFieldRow>> = [
  { key: "field", label: "Field", value: (row) => row.field },
  { key: "value", label: "Value", value: (row) => row.value },
]

function buildTopFieldRows(
  input: WorkOrderFileGenerationInput,
  config: WorkOrderPrintConfig,
): TopFieldRow[] {
  return WORK_ORDER_TOP_FIELD_KEYS.filter((key) => config.topFields[key]).map((key) => ({
    field: WORK_ORDER_TOP_FIELD_LABELS[key],
    value: resolveWorkOrderTopFieldValue(input, key),
  }))
}

// Each bottom-table row carries its group's product name alongside the projection.
type AdjustmentExportRow = WorkOrderFileAdjustmentProjection & { productName: string }
type MaterialExportRow = WorkOrderFileMaterialItemProjection & { productName: string }

// The top-field block reads vertically down columns A (Field) + B (Value). The
// bottom tables indent past it — three empty leading columns so Product lands in
// column D (C stays a visual gap). Purely a spreadsheet-layout nicety.
const BOTTOM_TABLE_INDENT = 3

function leadingSpacerColumns<TRow>(count: number): ExportColumn<TRow>[] {
  const spacers: ExportColumn<TRow>[] = []
  for (let index = 0; index < count; index += 1) {
    spacers.push({ key: `spacer-${index}`, label: "", value: () => "" })
  }
  return spacers
}

/** Flatten the adjustment groups to the selected rows (absent selection ⇒ all). */
function selectAdjustmentRows(
  input: WorkOrderFileGenerationInput,
  config: WorkOrderPrintConfig,
): AdjustmentExportRow[] {
  const selected = config.selectedAdjustmentIds ? new Set(config.selectedAdjustmentIds) : null
  return input.adjustmentGroups.flatMap((group) =>
    group.adjustments
      .filter((adjustment) => !selected || selected.has(adjustment.id))
      .map((adjustment) => ({ ...adjustment, productName: group.productName })),
  )
}

/** Flatten the material groups to the selected rows (absent selection ⇒ all). */
function selectMaterialRows(
  input: WorkOrderFileGenerationInput,
  config: WorkOrderPrintConfig,
): MaterialExportRow[] {
  const selected = config.selectedMaterialIds ? new Set(config.selectedMaterialIds) : null
  return input.materialItemGroups.flatMap((group) =>
    group.materialItems
      .filter((item) => !selected || selected.has(item.id))
      .map((item) => ({ ...item, productName: group.productName })),
  )
}

/**
 * Adjustment columns in print order — Product · Dyelot? · Roll#? · Quantity ·
 * Adjustment? · Location? — gated by `config.adjustmentColumns` (Product +
 * Quantity always show). Mirrors `renderWorkOrderAdjustments`.
 */
function buildAdjustmentColumns(
  config: WorkOrderPrintConfig,
): ReadonlyArray<ExportColumn<AdjustmentExportRow>> {
  const columns: ExportColumn<AdjustmentExportRow>[] = [
    ...leadingSpacerColumns<AdjustmentExportRow>(BOTTOM_TABLE_INDENT),
    { key: "product", label: "Adjustment Products", value: (row) => row.productName },
  ]
  if (config.adjustmentColumns.dyeLot) {
    columns.push({ key: "dyeLot", label: "Dyelot", value: (row) => row.dyeLot })
  }
  if (config.adjustmentColumns.rollNumber) {
    columns.push({ key: "rollNumber", label: "Roll#", value: (row) => row.rollNumber })
  }
  columns.push({
    key: "quantity",
    label: "Quantity",
    value: (row) => formatUnitValue(row.quantity, row.unitAbbrev),
  })
  if (config.adjustmentColumns.adjustment) {
    columns.push({
      key: "adjustment",
      label: "Adjustment",
      value: (row) => formatTransition(row.before, row.after, row.unitAbbrev),
    })
  }
  if (config.adjustmentColumns.location) {
    columns.push({ key: "location", label: "Location", value: (row) => row.location })
  }
  if (config.adjustmentColumns.area) {
    columns.push({ key: "area", label: "Area", value: (row) => row.area })
  }
  return columns
}

/**
 * Material columns in print order — Product · Notes? · Qty / Unit — gated by
 * `config.materialColumns` (Product + Qty/Unit always show). Mirrors
 * `renderWorkOrderMaterialItems`.
 */
function buildMaterialColumns(
  config: WorkOrderPrintConfig,
): ReadonlyArray<ExportColumn<MaterialExportRow>> {
  const columns: ExportColumn<MaterialExportRow>[] = [
    ...leadingSpacerColumns<MaterialExportRow>(BOTTOM_TABLE_INDENT),
    { key: "product", label: "Requested Products", value: (row) => row.productName },
  ]
  if (config.materialColumns.notes) {
    columns.push({ key: "notes", label: "Notes", value: (row) => row.notes })
  }
  columns.push({
    key: "qtyUnit",
    label: "Qty / Unit",
    value: (row) => formatUnitValue(row.quantity, row.unitAbbrev),
  })
  return columns
}
