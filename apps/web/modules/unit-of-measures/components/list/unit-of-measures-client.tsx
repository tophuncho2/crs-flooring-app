"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { useListViewEngine } from "@/modules/shared/engines/list-view/controllers/use-list-view-engine"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import { type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import type { UnitOfMeasureRow } from "../../domain/types"
import { useUnitOfMeasuresListController } from "../../controllers/use-unit-of-measures-list-controller"
import { UnitOfMeasuresTable } from "./unit-of-measures-table"

const UOM_FIELDS = [
  { key: "name", label: "Unit Of Measure", getValue: (row: UnitOfMeasureRow) => row.name, groupable: true },
  { key: "createdAt", label: "Created", getValue: (row: UnitOfMeasureRow) => row.createdAt, groupable: false },
]

export default function UnitOfMeasuresClient({
  canManage,
  initialUnitOfMeasures,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  canManage: boolean
  initialUnitOfMeasures: UnitOfMeasureRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useUnitOfMeasuresListController(initialUnitOfMeasures)
  const navigation = useRecordEntryNavigation("/dashboard/unit-of-measures")
  const engine = useListViewEngine({
    rows: controller.rows,
    tableKey: "unit-of-measures-main",
    fields: UOM_FIELDS,
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
        title={<DashboardCardTitle>Unit Of Measures</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            engine={engine}
            searchPlaceholder="Search units of measure..."
            formSlot={
              canManage ? (
                <button
                  type="button"
                  onClick={() => navigation.openCreate()}
                  className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
                >
                  <Plus size={16} />
                  Unit Of Measure
                </button>
              ) : undefined
            }
          />
        }
        notices={<FormStatusNotices message={controller.notices.message} error={controller.notices.error} />}
        table={
          <UnitOfMeasuresTable
            rows={engine.processedRows}
            visibleColumns={engine.visibleColumns.map((key) => ({
              key,
              label: UOM_FIELDS.find((f) => f.key === key)?.label ?? key,
            }))}
            groupedRows={engine.groupedRowTree as GroupedRowTree<UnitOfMeasureRow>[]}
            isGroupingEnabled={engine.isGroupingEnabled}
            onOpen={(row) => navigation.openRecord(row.id)}
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
