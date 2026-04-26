"use client"

import { SectionHeader } from "@/components/headers"
import { SearchControl } from "@/components/features/search"
import { SortToggle } from "@/components/features/sort"
import { useConfiguredTableState } from "@/modules/shared/engines/list-view/controllers/use-configured-table-state"
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
    filteredRows,
    sortedRows,
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

  const totalItems = pagination?.totalItems ?? filteredRows.length

  return (
    <div className="min-h-screen bg-[var(--background)] px-0 pt-24 pb-12 text-[var(--foreground)] sm:pt-28">
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
        <SectionHeader
          title="Templates"
          actions={[
            {
              key: "new",
              label: "+ Template",
              onClick: () => templateNavigation.openCreate(),
              kind: "primary",
            },
          ]}
        />

        {controller.notices.message || controller.notices.error ? (
          <div className="space-y-2 border-b border-[var(--panel-border)] px-4 py-3">
            {controller.notices.message ? (
              <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800">
                {controller.notices.message}
              </div>
            ) : null}
            {controller.notices.error ? (
              <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-800">
                {controller.notices.error}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-2 border-b border-[var(--panel-border)] px-4 py-3">
          <div className="min-w-[16rem] flex-1">
            <SearchControl
              query={searchQuery}
              onQueryChange={onSearchQueryChange}
              placeholder="Search templates..."
            />
          </div>
          <SortToggle
            sortKey="templateNumber"
            direction={isAscendingSort ? "asc" : "desc"}
            onChange={() => onToggleSort()}
            ascendingLabel="A-Z"
            descendingLabel="Z-A"
          />
          <span className="text-xs text-[var(--foreground)]/55">
            {filteredRows.length} of {totalItems} templates
          </span>
        </div>

        <TemplatesTable
          rows={sortedRows}
          visibleColumns={visibleColumns.map((column) => ({ key: column.key, label: column.label }))}
          pagination={pagination}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
          onOpen={(row) => templateNavigation.openRecord(row.id)}
        />
      </div>
    </div>
  )
}
