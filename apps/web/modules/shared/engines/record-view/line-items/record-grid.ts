import type { RecordGridColumnSpec, RecordGridControlSpec, RecordGridLayout } from "@/modules/shared/engines/record-view"

type ItemControlColumnOptions = {
  supportsScopedRows?: boolean
  supportsOpenRow?: boolean
  supportsStatusColumn?: boolean
  supportsRemoveRow?: boolean
}

const MATERIAL_ITEM_BASE_COLUMNS = [
  {
    key: "product",
    label: "Product",
    kind: "select",
    minWidth: 320,
    preferredWidth: 352,
    grow: 2.3,
    editable: true,
  },
  {
    key: "quantity",
    label: "Qty",
    kind: "quantity",
    minWidth: 140,
    preferredWidth: 148,
    grow: 0.72,
    align: "center",
    editable: true,
  },
  {
    key: "unit",
    label: "Unit",
    kind: "unit",
    minWidth: 124,
    preferredWidth: 136,
    grow: 0.66,
    align: "center",
    editable: false,
  },
  {
    key: "unitPrice",
    label: "Unit Price",
    kind: "currency",
    minWidth: 208,
    preferredWidth: 216,
    grow: 0.92,
    align: "end",
    editable: true,
  },
  {
    key: "total",
    label: "Total",
    kind: "currency",
    minWidth: 168,
    preferredWidth: 176,
    grow: 0.74,
    align: "end",
    editable: false,
  },
  {
    key: "notes",
    label: "Notes",
    kind: "notes",
    minWidth: 240,
    preferredWidth: 256,
    grow: 1.15,
    editable: true,
  },
] satisfies RecordGridColumnSpec[]

const SERVICE_ITEM_BASE_COLUMNS = [
  {
    key: "service",
    label: "Service",
    kind: "select",
    minWidth: 256,
    preferredWidth: 272,
    grow: 1.62,
    editable: true,
  },
  {
    key: "name",
    label: "Name",
    kind: "text",
    minWidth: 256,
    preferredWidth: 272,
    grow: 1.62,
    editable: true,
  },
  {
    key: "quantity",
    label: "Qty",
    kind: "quantity",
    minWidth: 132,
    preferredWidth: 140,
    grow: 0.68,
    align: "center",
    editable: true,
  },
  {
    key: "unit",
    label: "Unit",
    kind: "unit",
    minWidth: 144,
    preferredWidth: 152,
    grow: 0.74,
    align: "center",
    editable: true,
  },
  {
    key: "unitPrice",
    label: "Unit Price",
    kind: "currency",
    minWidth: 208,
    preferredWidth: 216,
    grow: 0.92,
    align: "end",
    editable: true,
  },
  {
    key: "total",
    label: "Total",
    kind: "currency",
    minWidth: 168,
    preferredWidth: 176,
    grow: 0.74,
    align: "end",
    editable: false,
  },
  {
    key: "notes",
    label: "Notes",
    kind: "notes",
    minWidth: 224,
    preferredWidth: 240,
    grow: 1.1,
    editable: true,
  },
] satisfies RecordGridColumnSpec[]

const SALES_REP_BASE_COLUMNS = [
  {
    key: "salesRep",
    label: "Sales Rep",
    kind: "select",
    minWidth: 320,
    preferredWidth: 336,
    grow: 2.15,
    editable: true,
  },
  {
    key: "percent",
    label: "Percent",
    kind: "number",
    minWidth: 156,
    preferredWidth: 164,
    grow: 0.78,
    align: "center",
    editable: true,
  },
  {
    key: "total",
    label: "Total",
    kind: "currency",
    minWidth: 168,
    preferredWidth: 176,
    grow: 0.8,
    align: "end",
    editable: false,
  },
] satisfies RecordGridColumnSpec[]

export const CALCULATION_ROW_COLUMNS = [
  {
    key: "calculation",
    label: "Calculation",
    kind: "readonly-value",
    minWidth: 288,
    preferredWidth: 304,
    grow: 2,
    editable: false,
  },
  {
    key: "value",
    label: "Value",
    kind: "readonly-value",
    minWidth: 176,
    preferredWidth: 192,
    grow: 0.9,
    align: "end",
    editable: false,
  },
] satisfies RecordGridColumnSpec[]

const ALLOCATION_BASE_COLUMNS = [
  {
    key: "product",
    label: "Inventory",
    kind: "select",
    minWidth: 320,
    preferredWidth: 352,
    grow: 2.3,
    editable: true,
    tone: "allocation",
  },
  {
    key: "quantity",
    label: "Qty",
    kind: "quantity",
    minWidth: 140,
    preferredWidth: 148,
    grow: 0.72,
    align: "center",
    editable: true,
    tone: "allocation",
  },
  {
    key: "unit",
    label: "Unit",
    kind: "unit",
    minWidth: 124,
    preferredWidth: 136,
    grow: 0.66,
    align: "center",
    editable: false,
    tone: "allocation",
  },
  {
    key: "unitPrice",
    label: "Unit Cost",
    kind: "currency",
    minWidth: 208,
    preferredWidth: 216,
    grow: 0.92,
    align: "end",
    editable: false,
    tone: "allocation",
  },
  {
    key: "total",
    label: "Total",
    kind: "currency",
    minWidth: 168,
    preferredWidth: 176,
    grow: 0.74,
    align: "end",
    editable: false,
    tone: "allocation",
  },
  {
    key: "notes",
    label: "Notes",
    kind: "notes",
    minWidth: 240,
    preferredWidth: 256,
    grow: 1.15,
    editable: true,
    tone: "allocation",
  },
] satisfies RecordGridColumnSpec[]

function buildItemControlColumns({
  supportsScopedRows = false,
  supportsOpenRow = false,
  supportsStatusColumn = false,
  supportsRemoveRow = false,
}: ItemControlColumnOptions) {
  const columns: RecordGridColumnSpec[] = []

  if (supportsScopedRows) {
    columns.push({
      key: "allocations",
      label: "Show / Hide",
      kind: "toggle",
      minWidth: 136,
      preferredWidth: 144,
      grow: 0.76,
      align: "center",
      editable: false,
    })
  }

  if (supportsOpenRow) {
    columns.push({
      key: "open",
      label: "Open",
      kind: "open",
      minWidth: 112,
      preferredWidth: 120,
      grow: 0.56,
      align: "center",
      editable: false,
    })
  }

  if (supportsStatusColumn) {
    columns.push({
      key: "status",
      label: "Status",
      kind: "status",
      minWidth: 176,
      preferredWidth: 184,
      grow: 0.9,
      align: "center",
      editable: false,
    })
  }

  if (supportsRemoveRow) {
    columns.push({
      key: "remove",
      label: "Remove",
      kind: "remove",
      minWidth: 112,
      preferredWidth: 120,
      grow: 0.52,
      align: "end",
      editable: false,
    })
  }

  return columns
}

export function buildMaterialItemColumns(options: ItemControlColumnOptions = {}) {
  return [
    ...MATERIAL_ITEM_BASE_COLUMNS,
    ...buildItemControlColumns(options),
  ] satisfies RecordGridColumnSpec[]
}

export function buildServiceItemColumns(options: ItemControlColumnOptions = {}) {
  return [
    ...SERVICE_ITEM_BASE_COLUMNS,
    ...buildItemControlColumns(options),
  ] satisfies RecordGridColumnSpec[]
}

export function buildSalesRepColumns(options: ItemControlColumnOptions = {}) {
  return [
    ...SALES_REP_BASE_COLUMNS,
    ...buildItemControlColumns(options),
  ] satisfies RecordGridColumnSpec[]
}

export function buildMaterialAllocationColumns(options: Pick<ItemControlColumnOptions, "supportsStatusColumn" | "supportsRemoveRow"> = {}) {
  return [
    ...ALLOCATION_BASE_COLUMNS,
    ...buildItemControlColumns({
      supportsStatusColumn: options.supportsStatusColumn,
      supportsRemoveRow: options.supportsRemoveRow,
    }),
  ] satisfies RecordGridColumnSpec[]
}

// --- Two-zone layout: data columns + fixed-width control strip ---

export const TOGGLE_CONTROL: RecordGridControlSpec = { key: "allocations", width: 144, label: "Show / Hide", kind: "toggle", align: "center" }
export const OPEN_CONTROL: RecordGridControlSpec = { key: "open", width: 120, label: "Open", kind: "open", align: "center" }
export const STATUS_CONTROL: RecordGridControlSpec = { key: "status", width: 184, label: "Status", kind: "status", align: "center" }
export const REMOVE_CONTROL: RecordGridControlSpec = { key: "remove", width: 120, label: "Remove", kind: "remove", align: "end" }

export function buildMaterialItemLayout(controls?: RecordGridControlSpec[]): RecordGridLayout {
  return { dataColumns: MATERIAL_ITEM_BASE_COLUMNS, controlColumns: controls }
}

export function buildServiceItemLayout(controls?: RecordGridControlSpec[]): RecordGridLayout {
  return { dataColumns: SERVICE_ITEM_BASE_COLUMNS, controlColumns: controls }
}

export function buildSalesRepLayout(controls?: RecordGridControlSpec[]): RecordGridLayout {
  return { dataColumns: SALES_REP_BASE_COLUMNS, controlColumns: controls }
}

export function buildAllocationLayout(controls?: RecordGridControlSpec[]): RecordGridLayout {
  return { dataColumns: ALLOCATION_BASE_COLUMNS, controlColumns: controls }
}

export function buildCalculationLayout(): RecordGridLayout {
  return { dataColumns: CALCULATION_ROW_COLUMNS }
}
