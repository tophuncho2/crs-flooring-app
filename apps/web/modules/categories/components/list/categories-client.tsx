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
import type { CategoryRow, UnitOfMeasureOption } from "../../domain/types"
import { useCategoriesListController } from "../../controllers/use-categories-list-controller"
import { CategoriesTable } from "./categories-table"

const CATEGORY_FIELDS = [
  { key: "name", label: "Category", getValue: (row: CategoryRow) => row.name, groupable: false },
  { key: "sendUnit", label: "Send Unit", getValue: (row: CategoryRow) => row.sendUnit, groupable: true },
  { key: "stockUnit", label: "Stock Unit", getValue: (row: CategoryRow) => row.stockUnit, groupable: true },
  { key: "coverageAvailableUnit", label: "Coverage Available Unit", getValue: (row: CategoryRow) => row.coverageAvailableUnit, groupable: true },
  { key: "itemCoverageUnit", label: "Item Coverage Unit", getValue: (row: CategoryRow) => row.itemCoverageUnit, groupable: true },
  { key: "serviceUnit", label: "Service Unit", getValue: (row: CategoryRow) => row.serviceUnit, groupable: true },
]

export default function CategoriesClient({
  canManage,
  initialCategories,
  unitOfMeasureOptions: _unitOfMeasureOptions,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: true, isGroupingEnabled: false, groupByKeys: [] },
}: {
  canManage: boolean
  initialCategories: CategoryRow[]
  unitOfMeasureOptions: UnitOfMeasureOption[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const controller = useCategoriesListController(initialCategories)
  const navigation = useRecordEntryNavigation("/dashboard/categories")
  const engine = useListViewEngine({
    rows: controller.rows,
    tableKey: "categories-main",
    fields: CATEGORY_FIELDS,
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
        title={<DashboardCardTitle>Categories</DashboardCardTitle>}
        controls={
          <DashboardListPageControls
            engine={engine}
            searchPlaceholder="Search categories..."
            formSlot={
              canManage ? (
                <button type="button" onClick={() => navigation.openCreate()} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
                  <Plus size={16} />
                  Category
                </button>
              ) : undefined
            }
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
            groupedRows={engine.groupedRowTree as GroupedRowTree<CategoryRow>[]}
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
