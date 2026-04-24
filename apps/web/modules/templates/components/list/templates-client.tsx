"use client"

import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { TablePaginationControls } from "@/modules/shared/engines/list-view/table/table-shell"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import { type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"
import type { TemplateListRow } from "@builders/domain"
import { useTemplatesListController } from "@/modules/templates/controllers/use-templates-list-controller"
import { TemplatesTable } from "./templates-table"

type ServerPaginationState = {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  previousPageHref: string
  nextPageHref: string
}

type ServerTableState = {
  searchQuery: string
  isAscendingSort: boolean
  isGroupingEnabled: boolean
  groupByKeys: string[]
}

export default function TemplatesClient({
  initialTemplates,
  tableState,
  pagination,
  initialTablePreferences,
}: {
  initialTemplates: TemplateListRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const controller = useTemplatesListController(initialTemplates)
  const templateNavigation = useRecordEntryNavigation("/dashboard/templates")

  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    filteredRows,
    sortedRows,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    visibleColumns,
    onSearchQueryChange,
    onToggleSort,
  } = useConfiguredTableState({
    rows: controller.rows,
    tableKey: "templates-main",
    fields: [
      { key: "templateNumber", label: "Template #", getValue: (row) => row.templateNumber },
      { key: "unitType", label: "Unit Type", getValue: (row) => row.unitType },
      { key: "property", label: "Property", getValue: (row) => row.propertyName },
      { key: "managementCompany", label: "Management Company", getValue: (row) => row.managementCompanyName ?? "" },
      { key: "jobType", label: "Job Type", getValue: (row) => row.jobTypeName ?? "" },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.warehouseName },
      { key: "description", label: "Description", getValue: (row) => row.description },
      { key: "items", label: "Items", getValue: (row) => String(row.itemsCount) },
    ],
    sortField: (row) => row.templateNumber,
    sortFieldKey: "templateNumber",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    initialPreferences: initialTablePreferences,
    urlSyncMode: "router",
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })

  return (
    <DashboardListPageScaffold
      title={<DashboardCardTitle>Templates</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          count={filteredRows.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder="Search templates..."
          isAscendingSort={isAscendingSort}
          onToggleSort={onToggleSort}
          primaryAction={
            <button
              type="button"
              onClick={() => templateNavigation.openCreate()}
              className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
            >
              <Plus size={16} />
              Template
            </button>
          }
        />
      }
      notices={
        <FormStatusNotices message={controller.notices.message} error={controller.notices.error} />
      }
      table={
        <TemplatesTable
          rows={sortedRows}
          visibleColumns={visibleColumns}
          groupedRows={groupedRowTree as GroupedRowTree<TemplateListRow>[]}
          isGroupingEnabled={isGroupingEnabled}
          onOpen={(row) => templateNavigation.openRecord(row.id)}
        />
      }
      pagination={
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredRows.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      }
    />
  )
}
