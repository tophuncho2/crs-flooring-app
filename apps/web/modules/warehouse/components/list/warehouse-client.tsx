"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { useListViewEngine } from "@/modules/shared/engines/list-view/controllers/use-list-view-engine"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import type { GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import type { WarehouseRecord } from "@builders/db"
import { WarehouseTable } from "./warehouse-table"

export type { WarehouseRecord } from "@builders/db"

const WAREHOUSE_FIELDS = [
  { key: "name", label: "Warehouse", getValue: (row: WarehouseRecord) => row.name, groupable: false },
  { key: "address", label: "Address", getValue: (row: WarehouseRecord) => row.address ?? "", groupable: true },
  { key: "phone", label: "Store Phone", getValue: (row: WarehouseRecord) => row.phone ?? "", groupable: true },
  { key: "sections", label: "Sections", getValue: (row: WarehouseRecord) => String(row.sectionsCount), groupable: true },
  { key: "locations", label: "Locations", getValue: (row: WarehouseRecord) => String(row.locationsCount), groupable: true },
  { key: "workOrders", label: "Work Orders", getValue: (row: WarehouseRecord) => String(row.workOrdersCount), groupable: true },
]

export default function WarehouseClient({
  initialRows,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  initialRows: WarehouseRecord[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState?: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const warehouseNavigation = useRecordEntryNavigation("/dashboard/warehouse")
  const engine = useListViewEngine({
    rows: initialRows,
    tableKey: "warehouse-main",
    fields: WAREHOUSE_FIELDS,
    sortField: (row) => row.name,
    sortFieldKey: "name",
    initialSearchQuery: tableState.searchQuery,
    defaultAscending: tableState.isAscendingSort,
    defaultGroupKeys: tableState.groupByKeys,
    initialPreferences: initialTablePreferences,
  })

  return (
    <>
      <DashboardListPageScaffold
        title={<DashboardCardTitle>Warehouse</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            engine={engine}
            searchPlaceholder="Search warehouses..."
            formSlot={
              <button
                onClick={() => warehouseNavigation.openCreate()}
                type="button"
                className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
              >
                <Plus size={16} />
                Add Warehouse
              </button>
            }
          />
        }
        table={
          <WarehouseTable
            rows={engine.processedRows}
            visibleColumns={engine.visibleColumns.map((key) => ({
              key,
              label: WAREHOUSE_FIELDS.find((f) => f.key === key)?.label ?? key,
            }))}
            groupedRows={engine.groupedRowTree as GroupedRowTree<WarehouseRecord>[]}
            isGroupingEnabled={engine.isGroupingEnabled}
            onOpen={(row) => warehouseNavigation.openRecord(row.id)}
          />
        }
        pagination={
          <TablePaginationControls
            page={engine.page}
            totalPages={engine.totalPages}
            pageSize={engine.pageSize}
            totalItems={engine.processedRows.length}
            hasPreviousPage={engine.hasPreviousPage}
            hasNextPage={engine.hasNextPage}
            onPreviousPage={engine.goToPreviousPage}
            onNextPage={engine.goToNextPage}
          />
        }
      />
    </>
  )
}
