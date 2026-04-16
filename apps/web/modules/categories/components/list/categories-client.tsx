"use client"

import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { useListViewEngine } from "@/modules/shared/engines/list-view/controllers/use-list-view-engine"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import type { CategoryRow } from "../../types"
import { useCategoriesListController } from "../../controllers/use-categories-list-controller"
import { CategoriesTable } from "./categories-table"

const CATEGORY_FIELDS = [
  { key: "name", label: "Category", getValue: (row: CategoryRow) => row.name, groupable: false },
  { key: "sendUnit", label: "Send Unit", getValue: (row: CategoryRow) => row.sendUnit, groupable: false },
  { key: "stockUnit", label: "Stock Unit", getValue: (row: CategoryRow) => row.stockUnit, groupable: false },
  { key: "coverageAvailableUnit", label: "Coverage Available Unit", getValue: (row: CategoryRow) => row.coverageAvailableUnit, groupable: false },
  { key: "itemCoverageUnit", label: "Item Coverage Unit", getValue: (row: CategoryRow) => row.itemCoverageUnit, groupable: false },
  { key: "serviceUnit", label: "Service Unit", getValue: (row: CategoryRow) => row.serviceUnit, groupable: false },
]

export default function CategoriesClient({
  initialCategories,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true },
}: {
  initialCategories: CategoryRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
  }
}) {
  const controller = useCategoriesListController(initialCategories)
  const engine = useListViewEngine({
    rows: controller.rows,
    tableKey: "categories-main",
    fields: CATEGORY_FIELDS,
    sortField: (row) => row.name,
    sortFieldKey: "name",
    initialSearchQuery: tableState.searchQuery,
    defaultAscending: tableState.isAscendingSort,
    initialPreferences: initialTablePreferences,
  })

  return (
    <>
      <DashboardListPageScaffold
        title={<DashboardCardTitle>Categories</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            engine={engine}
            searchPlaceholder="Search categories..."
          />
        }
        notices={<FormStatusNotices message={controller.notices.message} error={controller.notices.error} />}
        table={
          <CategoriesTable
            rows={engine.processedRows}
            visibleColumns={engine.visibleColumns.map((key) => ({
              key,
              label: CATEGORY_FIELDS.find((f) => f.key === key)?.label ?? key,
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
