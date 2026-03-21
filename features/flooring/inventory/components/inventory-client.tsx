"use client"

import { type ReactNode, useEffect, useMemo, useState } from "react"
import { requestJson } from "@/features/flooring/shared/http"
import { BasicRecordPanel } from "@/features/flooring/shared/basic-record-panel"
import { CutLogsEditor, type CutLogDraft, type EditableCutLog } from "@/features/flooring/shared/cut-logs-editor"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/dashboard-card-title"
import { formatStableDate } from "@/features/flooring/shared/date-format"
import { ErrorNotice, SuccessNotice } from "@/features/flooring/shared/notices"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/primary-record-panel"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/record-form"
import { DeleteRowButton, EditRowButton, OpenRowButton } from "@/features/flooring/shared/row-action-buttons"
import { StatusPill } from "@/features/flooring/shared/status-pill"
import { TableColumnSettings } from "@/features/flooring/shared/table-column-settings"
import TableControlsBar from "@/features/flooring/shared/table-controls-bar"
import { TableActionsSummary, TableEmptyRow, TableGroupRow, TableHead, TableHeaderCell, TablePaginationControls, TableShell } from "@/features/flooring/shared/table-shell"
import { useConfiguredTableState } from "@/features/flooring/shared/use-configured-table-state"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import { useServerTableQueryControls } from "@/features/flooring/shared/use-server-table-query-controls"
import { MAX_GROUP_FIELDS, type GroupedRowTree } from "@/features/flooring/shared/use-table-controls"
import {
  formatImportStatus,
  formatTransportType,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "@/features/flooring/imports/contracts"

type CutLogRow = EditableCutLog & {
  inventoryId: string
  inventoryLabel: string
  itemNumber: string
}

type InventoryRow = {
  id: string
  importEntryId: string
  importWarehouseId: string
  importNumber: string
  importTag: string
  importStatus: string
  importTransportType: string
  importWarehouseName: string
  productId: string
  productName: string
  stockUnit: string
  itemNumber: string
  dyeLot: string
  locationId: string
  locationCode: string
  warehouseId: string
  warehouseName: string
  sectionName: string
  stockCount: string
  cutTotal: string
  runningBalance: string
  cost: string
  freight: string
  notes: string
  createdAt: string
  updatedAt: string
  cutLogs: CutLogRow[]
}

type LocationOption = {
  id: string
  warehouseId: string
  locationCode: string
  label: string
  sectionName?: string | null
  warehouseName?: string | null
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

type ActivePanelState = {
  id: string
  mode: "open" | "edit"
}

const emptyCutLogDraft: CutLogDraft = {
  quantityTaken: "",
  notes: "",
}

function parseDecimal(value: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function toFixedString(value: number) {
  return value.toFixed(2)
}

function formatImportNumber(value: string) {
  return value ? `IMP-${value.padStart(4, "0")}` : "-"
}

function formatQuantity(value: string, unitLabel: string) {
  return `${value} ${unitLabel}`.trim()
}

function InventoryInfoCard({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
      <p className="text-xs text-[var(--foreground)]/60">{label}</p>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  )
}

function InventorySnapshotGrid({
  row,
  locationCode,
  sectionName,
  warehouseName,
}: {
  row: InventoryRow
  locationCode: string
  sectionName: string
  warehouseName: string
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <InventoryInfoCard label="Import #" value={formatImportNumber(row.importNumber)} />
      <InventoryInfoCard label="Import Tag" value={row.importTag || "-"} />
      <InventoryInfoCard label="Product" value={row.productName} />
      <InventoryInfoCard label="Item #" value={row.itemNumber} />
      <InventoryInfoCard label="Warehouse" value={warehouseName || "-"} />
      <InventoryInfoCard label="Section" value={sectionName || "-"} />
      <InventoryInfoCard label="Location" value={locationCode || "-"} />
      <InventoryInfoCard label="Dye Lot" value={row.dyeLot || "-"} />
      <InventoryInfoCard label="Starting Stock" value={formatQuantity(row.stockCount, row.stockUnit)} />
      <InventoryInfoCard label="Cuts Total" value={formatQuantity(row.cutTotal, row.stockUnit)} />
      <InventoryInfoCard label="Running Balance" value={<span className="text-blue-500">{formatQuantity(row.runningBalance, row.stockUnit)}</span>} />
      <InventoryInfoCard label="Notes" value={row.notes || "-"} />
    </div>
  )
}

function InventoryHeaderActions({ row }: { row: InventoryRow }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatusPill label={formatTransportType(row.importTransportType)} toneClassName={getTransportTypeFieldClass(row.importTransportType)} />
      <StatusPill label={formatImportStatus(row.importStatus)} toneClassName={getImportStatusFieldClass(row.importStatus)} />
    </div>
  )
}

export default function InventoryClient({
  initialInventory,
  locationOptions,
  tableState,
  pagination,
}: {
  initialInventory: InventoryRow[]
  locationOptions: LocationOption[]
  tableState: ServerTableState
  pagination?: ServerPaginationState
}) {
  const [rows, setRows] = useState(initialInventory)
  const [activePanel, setActivePanel] = useState<ActivePanelState | null>(null)
  const [editLocationId, setEditLocationId] = useState("")
  const [cutLogDraft, setCutLogDraft] = useState<CutLogDraft>(emptyCutLogDraft)
  const [isSavingInventory, setIsSavingInventory] = useState(false)
  const [isSavingCutLog, setIsSavingCutLog] = useState(false)
  const [deletingInventoryId, setDeletingInventoryId] = useState<string | null>(null)
  const [deletingCutLogId, setDeletingCutLogId] = useState<string | null>(null)
  const tableNotices = useRecordNotices()
  const panelNotices = useRecordNotices()

  const activeRow = useMemo(
    () => rows.find((row) => row.id === activePanel?.id) ?? null,
    [rows, activePanel?.id],
  )

  useEffect(() => {
    if (activePanel && !activeRow) {
      setActivePanel(null)
      setEditLocationId("")
      setCutLogDraft(emptyCutLogDraft)
      panelNotices.clearNotices()
    }
  }, [activePanel, activeRow, panelNotices])

  const selectedEditLocation = useMemo(
    () => locationOptions.find((location) => location.id === editLocationId) ?? null,
    [editLocationId, locationOptions],
  )

  const locationScopeId = activeRow?.importWarehouseId || activeRow?.warehouseId || ""
  const availableLocationOptions = useMemo(() => {
    if (!locationScopeId) {
      return locationOptions
    }

    return locationOptions.filter((location) => location.warehouseId === locationScopeId)
  }, [locationOptions, locationScopeId])

  const activeWarehouseName = selectedEditLocation?.warehouseName || activeRow?.importWarehouseName || activeRow?.warehouseName || ""
  const activeSectionName = selectedEditLocation?.sectionName || activeRow?.sectionName || ""
  const activeLocationCode = selectedEditLocation?.locationCode || activeRow?.locationCode || ""
  const activeRunningBalance = activeRow ? parseDecimal(activeRow.runningBalance) : 0
  const draftQuantity = parseDecimal(cutLogDraft.quantityTaken)
  const cutPreviewAfter = activeRow ? toFixedString(activeRunningBalance - draftQuantity) : "0.00"
  const canSubmitCutLog =
    Boolean(activeRow) &&
    cutLogDraft.quantityTaken.trim() !== "" &&
    draftQuantity !== 0 &&
    !(draftQuantity > 0 && activeRunningBalance <= 0) &&
    !(draftQuantity > activeRunningBalance)

  const {
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupFields,
    filteredRows: filteredInventory,
    sortedRows: sortedInventory,
    groupedRowTree,
    page,
    pageSize,
    totalPages,
    hasPreviousPage,
    hasNextPage,
    goToPreviousPage,
    goToNextPage,
    allColumns: orderedInventoryColumns,
    visibleColumns: visibleInventoryColumns,
    hiddenColumnKeys: hiddenInventoryColumnKeys,
    toggleColumnVisibility: toggleInventoryColumnVisibility,
    moveColumn: moveInventoryColumn,
    setColumnOrder: setInventoryColumnOrder,
  } = useConfiguredTableState({
    rows,
    tableKey: "inventory-main",
    fields: [
      { key: "edit", label: "Edit", getValue: () => "", searchable: false, groupable: false },
      { key: "open", label: "Open", getValue: () => "", searchable: false, groupable: false },
      { key: "importNumber", label: "Import #", getValue: (row) => row.importNumber, groupable: false },
      { key: "importTag", label: "Import Tag", getValue: (row) => row.importTag, groupable: false },
      { key: "status", label: "Import Status", getValue: (row) => formatImportStatus(row.importStatus), groupable: true },
      { key: "transport", label: "Transport", getValue: (row) => formatTransportType(row.importTransportType), groupable: true },
      { key: "product", label: "Product", getValue: (row) => row.productName, groupable: true },
      { key: "itemNumber", label: "Item #", getValue: (row) => row.itemNumber, groupable: false },
      { key: "stockCount", label: "Starting Stock", getValue: (row) => row.stockCount, groupable: false },
      { key: "cutTotal", label: "Cuts Total", getValue: (row) => row.cutTotal, groupable: false },
      { key: "runningBalance", label: "Running Balance", getValue: (row) => row.runningBalance, groupable: false },
      { key: "section", label: "Section", getValue: (row) => row.sectionName, groupable: true },
      { key: "location", label: "Location", getValue: (row) => row.locationCode, groupable: true },
      { key: "warehouse", label: "Warehouse", getValue: (row) => row.importWarehouseName || row.warehouseName, groupable: true },
      { key: "dyeLot", label: "Dye Lot", getValue: (row) => row.dyeLot, groupable: false },
      { key: "cost", label: "Cost $", getValue: (row) => row.cost, defaultHidden: true, groupable: false },
      { key: "freight", label: "Freight $", getValue: (row) => row.freight, defaultHidden: true, groupable: false },
      { key: "notes", label: "Notes", getValue: (row) => row.notes, defaultHidden: true, groupable: false },
      { key: "updated", label: "Updated", getValue: (row) => row.updatedAt.split("T")[0], defaultHidden: true, groupable: false },
      { key: "delete", label: "Delete", getValue: () => "", searchable: false, groupable: false },
    ],
    sortField: (row) => row.itemNumber,
    initialSearchQuery: tableState.searchQuery,
    defaultGrouped: tableState.isGroupingEnabled,
    defaultGroupKeys: tableState.groupByKeys,
    defaultAscending: tableState.isAscendingSort,
    disableClientFiltering: true,
    disableClientSorting: true,
    disableClientPagination: true,
  })

  const groupOptions = useMemo(
    () => groupFields.map((field) => ({ key: field.key, label: field.label })),
    [groupFields],
  )

  const serverTableControls = useServerTableQueryControls({
    searchQuery,
    setSearchQuery,
    isAscendingSort,
    setIsAscendingSort,
    isGroupingEnabled,
    setIsGroupingEnabled,
    groupByKeys,
    setGroupByKeys,
    groupOptions,
  })

  const isPanelBusy =
    isSavingInventory ||
    isSavingCutLog ||
    (activeRow ? deletingInventoryId === activeRow.id : false) ||
    deletingCutLogId !== null

  function resetPanelState() {
    setEditLocationId("")
    setCutLogDraft(emptyCutLogDraft)
    panelNotices.clearNotices()
  }

  function openPanel(row: InventoryRow, mode: ActivePanelState["mode"]) {
    setActivePanel({ id: row.id, mode })
    setEditLocationId(row.locationId)
    setCutLogDraft(emptyCutLogDraft)
    panelNotices.clearNotices()
  }

  function closePanel() {
    if (isPanelBusy) return
    setActivePanel(null)
    resetPanelState()
  }

  async function saveInventory() {
    if (!activeRow) return
    if (!editLocationId.trim()) {
      panelNotices.showError("Select a location before saving inventory")
      return
    }

    setIsSavingInventory(true)
    panelNotices.clearNotices()

    try {
      const payload = await requestJson<{ inventory: Omit<InventoryRow, "cutLogs"> }>(`/api/flooring/inventory/${activeRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          importEntryId: activeRow.importEntryId || null,
          productId: activeRow.productId,
          locationId: editLocationId,
          itemNumber: activeRow.itemNumber,
          dyeLot: activeRow.dyeLot,
          stockCount: activeRow.stockCount,
          cost: activeRow.cost || null,
          freight: activeRow.freight || null,
          notes: activeRow.notes || null,
        }),
      })

      setRows((previous) =>
        previous.map((row) =>
          row.id === activeRow.id
            ? {
                ...row,
                ...payload.inventory,
                cutLogs: row.cutLogs,
              }
            : row,
        ),
      )
      panelNotices.showSuccess("Inventory saved")
    } catch (saveError) {
      panelNotices.showError(saveError instanceof Error ? saveError.message : "Failed to save inventory")
    } finally {
      setIsSavingInventory(false)
    }
  }

  async function deleteInventory(id: string, source: "table" | "panel") {
    if (source === "table") {
      tableNotices.clearNotices()
    } else {
      panelNotices.clearNotices()
    }

    setDeletingInventoryId(id)

    try {
      await requestJson<{ ok: boolean }>(`/api/flooring/inventory/${id}`, { method: "DELETE" })
      setRows((previous) => previous.filter((row) => row.id !== id))
      tableNotices.showSuccess("Inventory deleted")
      if (source === "panel") {
        setActivePanel(null)
        resetPanelState()
      }
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete inventory"
      if (source === "panel") {
        panelNotices.showError(message)
      } else {
        tableNotices.showError(message)
      }
    } finally {
      setDeletingInventoryId(null)
    }
  }

  async function addCutLog() {
    if (!activeRow) return

    setIsSavingCutLog(true)
    panelNotices.clearNotices()

    try {
      const payload = await requestJson<{ cutLog: CutLogRow }>("/api/flooring/cut-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inventoryId: activeRow.id,
          quantityTaken: cutLogDraft.quantityTaken,
          notes: cutLogDraft.notes,
        }),
      })

      setRows((previous) =>
        previous.map((row) => {
          if (row.id !== activeRow.id) return row

          const nextCutLogs = [payload.cutLog, ...row.cutLogs]
          const nextCutTotal = nextCutLogs.reduce((sum, log) => sum + parseDecimal(log.cut), 0)

          return {
            ...row,
            cutLogs: nextCutLogs,
            cutTotal: toFixedString(nextCutTotal),
            runningBalance: toFixedString(parseDecimal(row.stockCount) - nextCutTotal),
          }
        }),
      )
      setCutLogDraft(emptyCutLogDraft)
      panelNotices.showSuccess("Cut added")
    } catch (saveError) {
      panelNotices.showError(saveError instanceof Error ? saveError.message : "Failed to add cut")
    } finally {
      setIsSavingCutLog(false)
    }
  }

  async function deleteCutLog(cutLogId: string) {
    if (!activeRow) return

    setDeletingCutLogId(cutLogId)
    panelNotices.clearNotices()

    try {
      const payload = await requestJson<{ success: boolean; updatedRows: Array<{ id: string; before: string; after: string }> }>(
        `/api/flooring/cut-logs/${cutLogId}`,
        { method: "DELETE" },
      )

      setRows((previous) =>
        previous.map((row) => {
          if (row.id !== activeRow.id) return row

          const nextCutLogs = row.cutLogs
            .filter((log) => log.id !== cutLogId)
            .map((log) => {
              const updated = payload.updatedRows.find((entry) => entry.id === log.id)
              return updated
                ? {
                    ...log,
                    before: updated.before,
                    after: updated.after,
                  }
                : log
            })

          const nextCutTotal = nextCutLogs.reduce((sum, log) => sum + parseDecimal(log.cut), 0)

          return {
            ...row,
            cutLogs: nextCutLogs,
            cutTotal: toFixedString(nextCutTotal),
            runningBalance: toFixedString(parseDecimal(row.stockCount) - nextCutTotal),
          }
        }),
      )
      panelNotices.showSuccess("Cut deleted")
    } catch (deleteError) {
      panelNotices.showError(deleteError instanceof Error ? deleteError.message : "Failed to delete cut")
    } finally {
      setDeletingCutLogId(null)
    }
  }

  function renderInventoryRow(row: InventoryRow) {
    const cells: Record<string, ReactNode> = {
      edit: (
        <td key="edit" className="px-3 py-2">
          <EditRowButton onClick={() => openPanel(row, "edit")} />
        </td>
      ),
      open: (
        <td key="open" className="px-3 py-2">
          <OpenRowButton onClick={() => openPanel(row, "open")} />
        </td>
      ),
      importNumber: <td key="importNumber" className="px-3 py-2 font-medium text-blue-500">{formatImportNumber(row.importNumber)}</td>,
      importTag: <td key="importTag" className="px-3 py-2">{row.importTag || "-"}</td>,
      status: (
        <td key="status" className="px-3 py-2">
          <StatusPill label={formatImportStatus(row.importStatus)} toneClassName={getImportStatusFieldClass(row.importStatus)} />
        </td>
      ),
      transport: (
        <td key="transport" className="px-3 py-2">
          <StatusPill label={formatTransportType(row.importTransportType)} toneClassName={getTransportTypeFieldClass(row.importTransportType)} />
        </td>
      ),
      product: <td key="product" className="px-3 py-2">{row.productName}</td>,
      itemNumber: <td key="itemNumber" className="px-3 py-2">{row.itemNumber}</td>,
      stockCount: <td key="stockCount" className="px-3 py-2">{formatQuantity(row.stockCount, row.stockUnit)}</td>,
      cutTotal: <td key="cutTotal" className="px-3 py-2">{formatQuantity(row.cutTotal, row.stockUnit)}</td>,
      runningBalance: <td key="runningBalance" className="px-3 py-2 font-semibold">{formatQuantity(row.runningBalance, row.stockUnit)}</td>,
      section: <td key="section" className="px-3 py-2">{row.sectionName || "-"}</td>,
      location: <td key="location" className="px-3 py-2">{row.locationCode || "-"}</td>,
      warehouse: <td key="warehouse" className="px-3 py-2">{row.importWarehouseName || row.warehouseName || "-"}</td>,
      dyeLot: <td key="dyeLot" className="px-3 py-2">{row.dyeLot || "-"}</td>,
      cost: <td key="cost" className="px-3 py-2">{row.cost || "-"}</td>,
      freight: <td key="freight" className="px-3 py-2">{row.freight || "-"}</td>,
      notes: <td key="notes" className="px-3 py-2">{row.notes || "-"}</td>,
      updated: <td key="updated" className="px-3 py-2">{formatStableDate(row.updatedAt)}</td>,
      delete: (
        <td key="delete" className="px-3 py-2">
          <DeleteRowButton onClick={() => void deleteInventory(row.id, "table")} disabled={deletingInventoryId === row.id}>
            {deletingInventoryId === row.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </td>
      ),
    }

    return (
      <tr key={row.id} className="border-t border-[var(--panel-border)]">
        {visibleInventoryColumns.map((column) => cells[column.key])}
      </tr>
    )
  }

  function renderGroupedRows(groups: GroupedRowTree<InventoryRow>[]): ReactNode[] {
    return groups.flatMap((group) => [
      <TableGroupRow
        key={`${group.depth}-${group.key}`}
        label={`${group.fieldLabel}: ${group.label}`}
        depth={group.depth}
        colSpan={visibleInventoryColumns.length}
      />,
      ...(group.children.length > 0 ? renderGroupedRows(group.children) : group.rows.map((row) => renderInventoryRow(row))),
    ])
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_CLASS_NAME}>
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <DashboardCardTitle>Inventory</DashboardCardTitle>
          </div>
          <TableActionsSummary count={filteredInventory.length}>
            <TableControlsBar
              searchQuery={searchQuery}
              onSearchQueryChange={serverTableControls.onSearchQueryChange}
              searchPlaceholder="Search product, item #, import, section, or location"
              isAscendingSort={isAscendingSort}
              onToggleSort={serverTableControls.onToggleSort}
              ascendingSortLabel="A-Z"
              descendingSortLabel="Z-A"
            >
              <TableColumnSettings
                columns={orderedInventoryColumns}
                hiddenColumnKeys={hiddenInventoryColumnKeys}
                onToggleColumn={toggleInventoryColumnVisibility}
                onMoveColumn={moveInventoryColumn}
                onSetColumnOrder={setInventoryColumnOrder}
                groupedColumnKeys={isGroupingEnabled ? groupByKeys : []}
                maxGroupFields={MAX_GROUP_FIELDS}
                onToggleGroupedColumn={serverTableControls.onToggleGroupByKey}
              />
            </TableControlsBar>
          </TableActionsSummary>
        </div>

        {tableNotices.message ? <SuccessNotice className="mt-3">{tableNotices.message}</SuccessNotice> : null}
        {tableNotices.error ? <ErrorNotice className="mt-3">{tableNotices.error}</ErrorNotice> : null}

        <TableShell minWidthClass="min-w-[1680px]">
          <TableHead>
            <tr>
              {visibleInventoryColumns.map((column) => (
                <TableHeaderCell key={column.key}>{column.label}</TableHeaderCell>
              ))}
            </tr>
          </TableHead>
          <tbody>
            {isGroupingEnabled ? renderGroupedRows(groupedRowTree) : sortedInventory.map((row) => renderInventoryRow(row))}
            {filteredInventory.length === 0 ? <TableEmptyRow message="No live inventory rows yet." colSpan={visibleInventoryColumns.length} /> : null}
          </tbody>
        </TableShell>
        <TablePaginationControls
          page={pagination?.page ?? page}
          totalPages={pagination?.totalPages ?? totalPages}
          pageSize={pagination?.pageSize ?? pageSize}
          totalItems={pagination?.totalItems ?? filteredInventory.length}
          hasPreviousPage={pagination ? pagination.page > 1 : hasPreviousPage}
          hasNextPage={pagination ? pagination.page < pagination.totalPages : hasNextPage}
          onPreviousPage={pagination ? undefined : goToPreviousPage}
          onNextPage={pagination ? undefined : goToNextPage}
          previousPageHref={pagination?.previousPageHref}
          nextPageHref={pagination?.nextPageHref}
        />
      </section>

      {activePanel?.mode === "open" && activeRow ? (
        <RecordModalShell
          title={`Inventory ${activeRow.itemNumber}`}
          onClose={closePanel}
          sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
          headerActions={<InventoryHeaderActions row={activeRow} />}
        >
          <div className="space-y-6">
            <InventorySnapshotGrid
              row={activeRow}
              locationCode={activeRow.locationCode}
              sectionName={activeRow.sectionName}
              warehouseName={activeRow.importWarehouseName || activeRow.warehouseName}
            />
            <CutLogsEditor
              items={activeRow.cutLogs}
              unitLabel={activeRow.stockUnit}
              readOnly
            />
          </div>
        </RecordModalShell>
      ) : null}

      {activePanel?.mode === "edit" && activeRow ? (
        <BasicRecordPanel
          title={`Inventory ${activeRow.itemNumber}`}
          onClose={closePanel}
          message={panelNotices.message}
          error={panelNotices.error}
          headerActions={<InventoryHeaderActions row={activeRow} />}
          saveLabel="Save Inventory"
          savingLabel="Saving..."
          deleteLabel="Delete Inventory"
          deleteConfirmMessage="Delete this inventory row?"
          onSave={() => void saveInventory()}
          onDelete={() => void deleteInventory(activeRow.id, "panel")}
          isSaving={isPanelBusy}
          sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
        >
          <InventorySnapshotGrid
            row={activeRow}
            locationCode={activeLocationCode}
            sectionName={activeSectionName}
            warehouseName={activeWarehouseName}
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <RecordFormField label="Location">
              <select
                value={editLocationId}
                onChange={(event) => setEditLocationId(event.target.value)}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              >
                <option value="">Select Location</option>
                {availableLocationOptions.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode}
                  </option>
                ))}
              </select>
            </RecordFormField>
            <RecordFormField label="Section">
              <input
                value={activeSectionName || ""}
                readOnly
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
              />
            </RecordFormField>
            <RecordFormField label="Import Warehouse">
              <input
                value={activeWarehouseName || ""}
                readOnly
                className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
              />
            </RecordFormField>
          </div>
          <CutLogsEditor
            items={activeRow.cutLogs}
            draft={cutLogDraft}
            beforePreview={toFixedString(activeRunningBalance)}
            afterPreview={cutPreviewAfter}
            unitLabel={activeRow.stockUnit}
            adding={isSavingCutLog}
            deletingItemId={deletingCutLogId}
            onDraftChange={(field, value) => setCutLogDraft((previous) => ({ ...previous, [field]: value }))}
            onAdd={() => addCutLog()}
            onDeleteItem={(itemId) => void deleteCutLog(itemId)}
            canSubmit={canSubmitCutLog}
            submitLabel="Add"
          />
          {activeRunningBalance <= 0 ? (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
              Running balance is 0. Positive cuts cannot be added until stock is restored.
            </p>
          ) : null}
        </BasicRecordPanel>
      ) : null}
    </div>
  )
}
