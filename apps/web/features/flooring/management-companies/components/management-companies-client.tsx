"use client"

import { type ReactNode, useState } from "react"
import { Plus } from "lucide-react"
import { FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME } from "@/features/dashboard/shared/display/accent-styles"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import {
  ClickableTableRow,
  TableEmptyRow,
  TablePaginationControls,
} from "@/features/dashboard/shared/table/table-shell"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { useRecordEntryNavigation } from "@/features/shared/engines/common/record-entry"

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
  const [companies, setCompanies] = useState<ManagementCompanyRow[]>(initialCompanies)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [noticeMessage, setNoticeMessage] = useState("")
  const [noticeError, setNoticeError] = useState("")
  const companyNavigation = useRecordEntryNavigation("/dashboard/flooring/management-companies")
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
    allColumns: orderedCompanyColumns,
    visibleColumns: visibleCompanyColumns,
    hiddenColumnKeys: hiddenCompanyColumnKeys,
    toggleColumnVisibility: toggleCompanyColumnVisibility,
    moveColumn: moveCompanyColumn,
    setColumnOrder: setCompanyColumnOrder,
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
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
      { key: "properties", label: "Properties", getValue: (row) => row.propertyPreviewNames.join(" ") },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
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

  async function deleteCompany(id: string) {
    setNoticeError("")
    setNoticeMessage("")
    setDeletingId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/management-companies/${id}`, { method: "DELETE" })
      setCompanies((previous) => previous.filter((company) => company.id !== id))
      setNoticeMessage("Management company deleted")
    } catch (deleteError) {
      setNoticeError(deleteError instanceof Error ? deleteError.message : "Failed to delete company")
    } finally {
      setDeletingId(null)
    }
  }

  function renderCompanyRow(row: ManagementCompanyRow) {
    const linkedProperties = row.propertyPreviewNames.join(", ") || "-"
    const remainingPropertyCount = Math.max(0, row.propertyCount - row.propertyPreviewNames.length)
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
      properties: (columnIndex) => (
        <DashboardListRowCell key="properties" columnIndex={columnIndex}>
          <p className="text-xs text-[var(--foreground)]/70">
            {linkedProperties}
            {remainingPropertyCount > 0 ? ` +${remainingPropertyCount} more` : ""}
          </p>
        </DashboardListRowCell>
      ),
      delete: (columnIndex) => (
        <DashboardListRowCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => void deleteCompany(row.id)} disabled={deletingId === row.id}>
            {deletingId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardListRowCell>
      ),
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
          columnSettingsSlot={
            <TableColumnSettings
              columns={orderedCompanyColumns}
              hiddenColumnKeys={hiddenCompanyColumnKeys}
              onToggleColumn={toggleCompanyColumnVisibility}
              onMoveColumn={moveCompanyColumn}
              onSetColumnOrder={setCompanyColumnOrder}
              groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
              maxGroupFields={MAX_GROUP_FIELDS}
              onToggleGroupedColumn={onToggleGroupedColumn}
            />
          }
          primaryAction={
            <button type="button" onClick={() => companyNavigation.openCreate()} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
              <Plus size={16} />
              Company
            </button>
          }
        />
      }
      notices={<FormStatusNotices message={noticeMessage} error={noticeError} />}
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
