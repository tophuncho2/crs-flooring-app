"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"
import { DashboardCardTitle } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { FormStatusNotices } from "@/modules/shared/engines/common/feedback/notices"
import { DashboardListPageControls } from "@/modules/shared/engines/list-view/controls/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/modules/shared/engines/list-view/scaffold/dashboard-list-page-scaffold"
import { DashboardListPageTable } from "@/modules/shared/engines/list-view/table/dashboard-list-page-table"
import { DashboardListRowCell } from "@/modules/shared/engines/list-view/table/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/modules/shared/engines/list-view/table/render-dashboard-row-cells"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/modules/shared/engines/list-view/table/table-shell"
import { renderGroupedTableRows } from "@/modules/shared/engines/list-view/table/render-grouped-table-rows"
import type { TablePreferencePayload } from "@/modules/shared/engines/list-view/controllers/table-preferences"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
import { type GroupedRowTree } from "@/modules/shared/engines/list-view/controllers/use-table-controls"
import { useRecordEntryNavigation } from "@/modules/shared/engines/common/record-entry"

type ManagementCompanyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  propertyCount: number
  propertyPreviewNames: string[]
}

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
  initialCompanies: ManagementCompanyRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const [companies] = useState<ManagementCompanyRow[]>(initialCompanies)
  const companyNavigation = useRecordEntryNavigation("/dashboard/management-companies")
  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
    filteredRows: filteredCompanies,
    sortedRows: sortedCompanies,
    groupedRowTree: groupedCompanies,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    visibleColumns: visibleCompanyColumns,
    onSearchQueryChange,
    onToggleSort,
  } = useConfiguredTableState({
    rows: companies,
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

  function renderCompanyRow(row: ManagementCompanyRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      company: (columnIndex) => (
        <DashboardListRowCell key="company" columnIndex={columnIndex} className="font-medium text-blue-500">
          {row.name}
        </DashboardListRowCell>
      ),
      street: (columnIndex) => <DashboardListRowCell key="street" columnIndex={columnIndex}>{row.streetAddress || "-"}</DashboardListRowCell>,
      city: (columnIndex) => <DashboardListRowCell key="city" columnIndex={columnIndex}>{row.city || "-"}</DashboardListRowCell>,
      state: (columnIndex) => <DashboardListRowCell key="state" columnIndex={columnIndex}>{row.state || "-"}</DashboardListRowCell>,
      zip: (columnIndex) => <DashboardListRowCell key="zip" columnIndex={columnIndex}>{row.zip || "-"}</DashboardListRowCell>,
      phone: (columnIndex) => <DashboardListRowCell key="phone" columnIndex={columnIndex}>{row.phone || "-"}</DashboardListRowCell>,
      email: (columnIndex) => <DashboardListRowCell key="email" columnIndex={columnIndex}>{row.email || "-"}</DashboardListRowCell>,
      fullAddress: (columnIndex) => <DashboardListRowCell key="fullAddress" columnIndex={columnIndex}>{row.fullAddress || "-"}</DashboardListRowCell>,
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit management company ${row.name}`} onClick={() => companyNavigation.openRecord(row.id)}>
        {renderDashboardRowCells(visibleCompanyColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageScaffold
      title={<DashboardCardTitle>Management Companies</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          count={filteredCompanies.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder="Search company or property"
          isAscendingSort={isAscendingSort}
          onToggleSort={onToggleSort}
          primaryAction={
            <button type="button" onClick={() => companyNavigation.openCreate()} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
              <Plus size={16} />
              Company
            </button>
          }
        />
      }
      notices={<FormStatusNotices message="" error="" />}
      table={
        <DashboardListPageTable minWidthClass="min-w-[1320px]" columns={visibleCompanyColumns}>
          {isGroupingEnabled
            ? renderGroupedTableRows({
                groups: groupedCompanies as GroupedRowTree<ManagementCompanyRow>[],
                colSpan: visibleCompanyColumns.length,
                renderRow: renderCompanyRow,
              })
            : sortedCompanies.map((row) => renderCompanyRow(row))}

          {filteredCompanies.length === 0 ? <TableEmptyRow message="No management companies found." colSpan={visibleCompanyColumns.length} /> : null}
        </DashboardListPageTable>
      }
      pagination={
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredCompanies.length}
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
