import {
  CALCULATION_ROW_COLUMNS,
  buildMaterialAllocationColumns,
  buildMaterialItemColumns,
  buildSalesRepColumns,
  buildServiceItemColumns,
} from "@/features/flooring/shared/line-items/record-grid"

export const WORK_ORDER_MATERIAL_COLUMNS = buildMaterialItemColumns({
  supportsNestedAllocations: true,
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_MATERIAL_ALLOCATION_COLUMNS = buildMaterialAllocationColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_SERVICE_COLUMNS = buildServiceItemColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_SALES_REP_COLUMNS = buildSalesRepColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const WORK_ORDER_CALCULATION_COLUMNS = CALCULATION_ROW_COLUMNS
