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
import type { ManagementCompanyListRow } from "@builders/domain"
import { useManagementCompaniesListController } from "@/modules/management-companies/controllers/use-management-companies-list-controller"
import { ManagementCompaniesTable } from "./management-companies-table"

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

export default function ManagementCompaniesClient({
  initialCompanies,
  tableState,
  pagination,
  initialTablePreferences,
}: {
  initialCompanies: ManagementCompanyListRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const controller = useManagementCompaniesListController(initialCompanies)
  const companyNavigation = useRecordEntryNavigation("/dashboard/management-companies")

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
    tableKey: "management-companies-main",
    fields: [
      { key: "company", label: "Company", getValue: (row) => row.name },
      { key: "street", label: "Street", getValue: (row) => row.streetAddress },
      { key: "city", label: "City", getValue: (row) => row.city },
      { key: "state", label: "State", getValue: (row) => row.state },
      { key: "zip", label: "Zip", getValue: (row) => row.zip },
      { key: "phone", label: "Phone", getValue: (row) => row.phone },
      { key: "email", label: "Email", getValue: (row) => row.email },
      { key: "fullAddress", label: "Full Address", getValue: (row) => row.fullAddress },
      { key: "properties", label: "Properties", getValue: (row) => String(row.propertyCount) },
    ],
    sortField: (row) => row.name,
    sortFieldKey: "company",
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
      title={<DashboardCardTitle>Management Companies</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          count={filteredRows.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder="Search company or property"
          isAscendingSort={isAscendingSort}
          onToggleSort={onToggleSort}
          primaryAction={
            <button
              type="button"
              onClick={() => companyNavigation.openCreate()}
              className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}
            >
              <Plus size={16} />
              Company
            </button>
          }
        />
      }
      notices={
        <FormStatusNotices message={controller.notices.message} error={controller.notices.error} />
      }
      table={
        <ManagementCompaniesTable
          rows={sortedRows}
          visibleColumns={visibleColumns}
          groupedRows={groupedRowTree as GroupedRowTree<ManagementCompanyListRow>[]}
          isGroupingEnabled={isGroupingEnabled}
          onOpen={(row) => companyNavigation.openRecord(row.id)}
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
