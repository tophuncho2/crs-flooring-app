"use client"

import { useState, type ReactNode } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/transport/client-errors"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { DashboardCardTitle } from "@/features/dashboard/shared/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import { DashboardListPageControls } from "@/features/dashboard/shared/list-page/dashboard-list-page-controls"
import { DashboardListPageScaffold } from "@/features/dashboard/shared/list-page/dashboard-list-page-scaffold"
import { DashboardListPageTable } from "@/features/dashboard/shared/list-page/dashboard-list-page-table"
import { DashboardListRowCell } from "@/features/dashboard/shared/list-page/dashboard-list-row-cell"
import { renderDashboardRowCells } from "@/features/dashboard/shared/list-page/render-dashboard-row-cells"
import { TableColumnSettings } from "@/features/dashboard/shared/table/table-column-settings"
import { renderGroupedTableRows } from "@/features/dashboard/shared/table/render-grouped-table-rows"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  TableEmptyRow,
  TablePaginationControls,
} from "@/features/dashboard/shared/table/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/controllers/table/use-configured-table-state"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/controllers/table/use-table-controls"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"
import { formatStableDateTime } from "@/features/flooring/shared/domain/date-format"
import type { CutLogPageRow } from "@/features/flooring/cut-logs/data/queries"

export default function CutLogsClient({
  initialLogs,
  initialTablePreferences,
  tableState = { searchQuery: "", isAscendingSort: false, isGroupingEnabled: false, groupByKeys: [] },
}: {
  initialLogs: CutLogPageRow[]
  initialTablePreferences?: TablePreferencePayload | null
  tableState?: {
    searchQuery: string
    isAscendingSort: boolean
    isGroupingEnabled: boolean
    groupByKeys: string[]
  }
}) {
  const [logs, setLogs] = useState(initialLogs)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const {
    searchQuery,
    isAscendingSort,
    isGroupingEnabled,
    groupByKeys,
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
    allColumns,
    visibleColumns,
    hiddenColumnKeys,
    toggleColumnVisibility,
    moveColumn,
    setColumnOrder,
    onSearchQueryChange,
    onToggleSort,
    onToggleGroupedColumn,
  } = useConfiguredTableState({
    rows: logs,
    tableKey: "cut-logs-main",
    fields: [
      { key: "created", label: "Created", getValue: (row) => row.createdAt, groupable: false },
      { key: "product", label: "Product", getValue: (row) => row.productName, groupable: true },
      { key: "itemNumber", label: "Item #", getValue: (row) => row.itemNumber, groupable: true },
      { key: "location", label: "Location", getValue: (row) => row.locationLabel, groupable: true },
      { key: "before", label: "Before", getValue: (row) => row.before, groupable: false },
      { key: "cut", label: "Cut", getValue: (row) => row.cut, groupable: false },
      { key: "after", label: "After", getValue: (row) => row.after, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.createdAt,
    sortFieldKey: "created",
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    urlSyncMode: "history",
    initialPreferences: initialTablePreferences,
  })

  async function deleteLog(id: string) {
    setMessage("")
    setError("")
    setDeletingId(id)

    try {
      const payload = await requestJson<{
        updatedRows?: Array<{ id: string; before: string; after: string }>
      }>(`/api/flooring/cut-logs/${id}`, { method: "DELETE" })

      const updatedMap = new Map((payload.updatedRows ?? []).map((row) => [row.id, row]))
      setLogs((prev) =>
        prev
          .filter((log) => log.id !== id)
          .map((log) => (updatedMap.has(log.id) ? { ...log, ...updatedMap.get(log.id)! } : log)),
      )
      setMessage("Cut deleted")
    } catch (deleteError) {
      setError(getClientErrorMessage(deleteError, "Failed to delete cut"))
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(log: CutLogPageRow) {
    const cells: Record<string, (columnIndex: number) => ReactNode> = {
      created: (columnIndex) => <DashboardListRowCell key="created" columnIndex={columnIndex}>{formatStableDateTime(log.createdAt)}</DashboardListRowCell>,
      product: (columnIndex) => <DashboardListRowCell key="product" columnIndex={columnIndex}>{log.productName}</DashboardListRowCell>,
      itemNumber: (columnIndex) => <DashboardListRowCell key="itemNumber" columnIndex={columnIndex}>{log.itemNumber}</DashboardListRowCell>,
      location: (columnIndex) => <DashboardListRowCell key="location" columnIndex={columnIndex}>{log.locationLabel}</DashboardListRowCell>,
      before: (columnIndex) => <DashboardListRowCell key="before" columnIndex={columnIndex}>{log.before}</DashboardListRowCell>,
      cut: (columnIndex) => <DashboardListRowCell key="cut" columnIndex={columnIndex}>{log.cut}</DashboardListRowCell>,
      after: (columnIndex) => <DashboardListRowCell key="after" columnIndex={columnIndex}>{log.after}</DashboardListRowCell>,
      notes: (columnIndex) => <DashboardListRowCell key="notes" columnIndex={columnIndex}>{log.notes || "-"}</DashboardListRowCell>,
      delete: (columnIndex) => (
        <DashboardListRowCell key="delete" columnIndex={columnIndex}>
          <DeleteRowButton onClick={() => void deleteLog(log.id)} disabled={deletingId === log.id}>
            {deletingId === log.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </DashboardListRowCell>
      ),
    }

    return <tr key={log.id} className="border-t border-[var(--panel-border)]">{renderDashboardRowCells(visibleColumns, cells)}</tr>
  }

  return (
    <DashboardListPageScaffold
      title={<DashboardCardTitle>Cut Logs</DashboardCardTitle>}
      controls={
        <DashboardListPageControls
          count={filteredRows.length}
          searchQuery={searchQuery}
          onSearchQueryChange={onSearchQueryChange}
          searchPlaceholder="Search product, item #, location, or notes"
          isAscendingSort={isAscendingSort}
          onToggleSort={onToggleSort}
          ascendingSortLabel="Old-New"
          descendingSortLabel="New-Old"
          columnSettingsSlot={
            <TableColumnSettings
              columns={allColumns}
              hiddenColumnKeys={hiddenColumnKeys}
              onToggleColumn={toggleColumnVisibility}
              onMoveColumn={moveColumn}
              onSetColumnOrder={setColumnOrder}
              groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
              maxGroupFields={MAX_GROUP_FIELDS}
              onToggleGroupedColumn={onToggleGroupedColumn}
            />
          }
        />
      }
      notices={<FormStatusNotices message={message} error={error} />}
      table={
        <DashboardListPageTable minWidthClass="min-w-[1180px]" columns={visibleColumns}>
          {isGroupingEnabled
            ? renderGroupedTableRows({
                groups: groupedRowTree as GroupedRowTree<CutLogPageRow>[],
                colSpan: visibleColumns.length,
                renderRow,
              })
            : sortedRows.map((log) => renderRow(log))}
          {sortedRows.length === 0 ? <TableEmptyRow message="No cut logs yet." colSpan={visibleColumns.length} /> : null}
        </DashboardListPageTable>
      }
      pagination={
        <TablePaginationControls
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          totalItems={filteredRows.length}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={goToPreviousPage}
          onNextPage={goToNextPage}
        />
      }
    />
  )
}
