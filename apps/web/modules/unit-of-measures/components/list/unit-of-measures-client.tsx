"use client"

import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { useListViewEngine } from "@/modules/shared/engines/list-view/controllers/use-list-view-engine"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import type { UnitOfMeasureRow } from "../../types"
import { useUnitOfMeasuresListController } from "../../controllers/use-unit-of-measures-list-controller"
import { UnitOfMeasuresTable } from "./unit-of-measures-table"

const UOM_FIELDS = [
  { key: "name", label: "Unit Of Measure", getValue: (row: UnitOfMeasureRow) => row.name, groupable: false },
  { key: "createdAt", label: "Created", getValue: (row: UnitOfMeasureRow) => row.createdAt, groupable: false },
]

export default function UnitOfMeasuresClient({
  initialUnitOfMeasures,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true },
}: {
  initialUnitOfMeasures: UnitOfMeasureRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
  }
}) {
  const controller = useUnitOfMeasuresListController(initialUnitOfMeasures)
  const engine = useListViewEngine({
    rows: controller.rows,
    tableKey: "unit-of-measures-main",
    fields: UOM_FIELDS,
    sortField: (row) => row.name,
    sortFieldKey: "name",
    initialSearchQuery: tableState.searchQuery,
    defaultAscending: tableState.isAscendingSort,
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
