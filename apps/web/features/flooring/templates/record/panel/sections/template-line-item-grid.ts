import {
  CALCULATION_ROW_COLUMNS,
  buildMaterialItemColumns,
  buildSalesRepColumns,
  buildServiceItemColumns,
} from "@/features/flooring/shared/line-items/record-grid"

export const TEMPLATE_MATERIAL_COLUMNS = buildMaterialItemColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const TEMPLATE_SERVICE_COLUMNS = buildServiceItemColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const TEMPLATE_SALES_REP_COLUMNS = buildSalesRepColumns({
  supportsStatusColumn: true,
  supportsRemoveRow: true,
})

export const TEMPLATE_CALCULATION_COLUMNS = CALCULATION_ROW_COLUMNS
