import {
  CALCULATION_ROW_COLUMNS,
  buildMaterialAllocationColumns,
  buildMaterialItemColumns,
  buildSalesRepColumns,
  buildServiceItemColumns,
  buildAllocationLayout,
  STATUS_CONTROL,
  REMOVE_CONTROL,
} from "@/modules/shared/engines/record-view/sections/rows/record-grid-columns"

export const WORK_ORDER_MATERIAL_COLUMNS = buildMaterialItemColumns({
  supportsScopedRows: true,
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_MATERIAL_ALLOCATION_COLUMNS = buildMaterialAllocationColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_MATERIAL_ALLOCATION_LAYOUT = buildAllocationLayout([
  STATUS_CONTROL,
  REMOVE_CONTROL,
])

export const WORK_ORDER_SERVICE_COLUMNS = buildServiceItemColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_SALES_REP_COLUMNS = buildSalesRepColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_CALCULATION_COLUMNS = CALCULATION_ROW_COLUMNS
