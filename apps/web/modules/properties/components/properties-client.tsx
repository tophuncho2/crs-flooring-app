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

type PropertyManagementCompany = {
  id: string
  name: string
}

type PropertyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: PropertyManagementCompany | null
  templateCount: number
  templatePreviewTags: string[]
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

export default function PropertiesClient({
  initialProperties,
  tableState,
  pagination,
  initialTablePreferences,
}: {
  initialProperties: PropertyRow[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
  initialTablePreferences?: TablePreferencePayload | null
}) {
  const [properties] = useState<PropertyRow[]>(initialProperties)
  const propertyNavigation = useRecordEntryNavigation("/dashboard/properties")
  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    filteredRows: filteredProperties,
    sortedRows: sortedProperties,
    groupedRowTree: groupedProperties,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    visibleColumns: visiblePropertyColumns,
    onSearchQueryChange,
    onToggleSort,
  } = useConfiguredTableState({
    rows: properties,
    tableKey: "properties-main",
    fields: [
      { key: "property", label: "Property", getValue: (row) => row.name, groupable: false },
      { key: "street", label: "Street", getValue: (row) => row.streetAddress, groupable: false },
      { key: "city", label: "City", getValue: (row) => row.city, groupable: true },
      { key: "state", label: "State", getValue: (row) => row.state, groupable: true },
      { key: "zip", label: "Zip", getValue: (row) => row.zip, groupable: false },
      { key: "phone", label: "Phone", getValue: (row) => row.phone, groupable: false },
      { key: "email", label: "Email", getValue: (row) => row.email, groupable: false },
      { key: "fullAddress", label: "Full Address", getValue: (row) => row.fullAddress, groupable: false },
      { key: "managementCompany", label: "Management Company", getValue: (row) => row.managementCompany?.name ?? "No management company", groupable: true },
    ],
    sortField: (row) => row.name,
    sortFieldKey: "property",
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

  function renderPropertyRow(row: PropertyRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      property: (columnIndex) => (
        <DashboardListRowCell key="property" columnIndex={columnIndex} className="font-medium text-blue-500">
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
      managementCompany: (columnIndex) => (
        <DashboardListRowCell key="managementCompany" columnIndex={columnIndex}>
          {row.managementCompany?.name || "No management company"}
        </DashboardListRowCell>
      ),
    }

    return (
      <ClickableTableRow key={row.id} ariaLabel={`Edit property ${row.name}`} onClick={() => propertyNavigation.openRecord(row.id)}>
        {renderDashboardRowCells(visiblePropertyColumns, cells)}
      </ClickableTableRow>
    )
  }

  return (
    <DashboardListPageScaffold
      title={<DashboardCardTitle>Properties</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          count={filteredProperties.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder="Search property or company"
          isAscendingSort={isAscendingSort}
          onToggleSort={onToggleSort}
          primaryAction={
            <button type="button" onClick={() => propertyNavigation.openCreate()} className={FLOORING_PRIMARY_ACTION_BUTTON_INLINE_CLASS_NAME}>
              <Plus size={16} />
              Property
            </button>
          }
        />
      }
      notices={<FormStatusNotices message="" error="" />}
      table={
        <DashboardListPageTable minWidthClass="min-w-[1320px]" columns={visiblePropertyColumns}>
          {isGroupingEnabled
            ? renderGroupedTableRows({
                groups: groupedProperties as GroupedRowTree<PropertyRow>[],
                colSpan: visiblePropertyColumns.length,
                renderRow: renderPropertyRow,
              })
            : sortedProperties.map((row) => renderPropertyRow(row))}

          {filteredProperties.length === 0 ? <TableEmptyRow message="No properties found." colSpan={visiblePropertyColumns.length} /> : null}
        </DashboardListPageTable>
      }
      pagination={
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredProperties.length}
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
