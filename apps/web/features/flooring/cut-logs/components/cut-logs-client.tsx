"use client"

import { useState, type ReactNode } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/transport/client-errors"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { DashboardCardHeader } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { TableColumnSettings } from "@/features/flooring/shared/ui/table/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/ui/table/table-controls-bar"
import { renderGroupedTableRows } from "@/features/flooring/shared/ui/table/render-grouped-table-rows"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { TableActionsSummary, TableEmptyRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "@/features/flooring/shared/ui/table/table-shell"
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
    const cells: Record<string, ReactNode> = {
      created: <td key="created" className="px-3 py-2">{formatStableDateTime(log.createdAt)}</td>,
      product: <td key="product" className="px-3 py-2">{log.productName}</td>,
      itemNumber: <td key="itemNumber" className="px-3 py-2">{log.itemNumber}</td>,
      location: <td key="location" className="px-3 py-2">{log.locationLabel}</td>,
      before: <td key="before" className="px-3 py-2">{log.before}</td>,
      cut: <td key="cut" className="px-3 py-2">{log.cut}</td>,
      after: <td key="after" className="px-3 py-2">{log.after}</td>,
      notes: <td key="notes" className="px-3 py-2">{log.notes || "-"}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteLog(log.id)} disabled={deletingId === log.id}>
            {deletingId === log.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return <tr key={log.id} className="border-t border-[var(--panel-border)]">{visibleColumns.map((column) => cells[column.key])}</tr>
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
      <DashboardCardHeader
        title="Cut Logs"
        actions={(
          <TableActionsSummary count={filteredRows.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              searchPlaceholder="Search product, item #, location, or notes"
              isAscendingSort={isAscendingSort}
              onToggleSort={onToggleSort}
              ascendingSortLabel="Old-New"
              descendingSortLabel="New-Old"
            >
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
            </TableControlsBar>
          </TableActionsSummary>
        )}
      />

      <FormStatusNotices message={message} error={error} className="mt-3" />

      <TableShell minWidthClass="min-w-[1180px]" className="mt-6">
        <TableHead>
          <tr>
            {visibleColumns.map((column) => (
              <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
            ))}
          </tr>
        </TableHead>
        <tbody>
          {isGroupingEnabled
            ? renderGroupedTableRows({
                groups: groupedRowTree as GroupedRowTree<CutLogPageRow>[],
                colSpan: visibleColumns.length,
                renderRow,
              })
            : sortedRows.map((log) => renderRow(log))}
          {sortedRows.length === 0 ? <TableEmptyRow message="No cut logs yet." colSpan={visibleColumns.length} /> : null}
        </tbody>
      </TableShell>

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
    </section>
  )
}
