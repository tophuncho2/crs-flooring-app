"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { StatusBadge } from "@/components/badges"
import {
  CheckboxCell,
  CurrencyCell,
  DropdownCell,
  RowActionButton,
  SelectCell,
  TextCell,
  UnitCell,
} from "@/components/cells"
import { DuplicateRowButton } from "@/components/features/duplicate-row"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
import { SelectAllButton } from "@/components/features/select-batch"
import type { FlooringStagedRowStatus, StagedInventoryRow } from "@builders/domain"
import type {
  CategoryOption,
  ImportStagedRowDraft,
  LocationOption,
  ProductOption,
  WarehouseOption,
} from "@/modules/imports/controllers/drafts"

type GridDraftRow = ImportStagedRowDraft & { id: string }

const STAGED_ROWS_LAYOUT: GridLayout<GridDraftRow> = {
  leadingControls: [{ key: "select", kind: "selection", width: 40 }],
  dataColumns: [
    { key: "categoryFilter", label: "Filter", minWidth: 132, grow: 0 },
    { key: "product", label: "Product", minWidth: 220, preferredWidth: 320, grow: 1.5 },
    { key: "itemNumber", label: "Item #", minWidth: 116, grow: 0 },
    { key: "startingStock", label: "Starting Stock", minWidth: 156, grow: 0, align: "center" },
    { key: "location", label: "Location", minWidth: 196, grow: 0 },
    { key: "dyeLot", label: "Dye Lot", minWidth: 124, grow: 0 },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.2 },
  ],
  trailingControls: [
    { key: "status", kind: "status-indicator", width: 132 },
    { key: "remove", kind: "actions", width: 116 },
  ],
}

function statusTone(status: FlooringStagedRowStatus | null) {
  return status === "QUEUED" ? ("processing" as const) : ("default" as const)
}

function statusLabel(status: FlooringStagedRowStatus | null): string {
  return status === "QUEUED" ? "Queued" : "Draft"
}

export function ImportStagedInventoryRowsSection({
  drafts,
  serverRows,
  warehouseId,
  productOptions,
  warehouseOptions: _warehouseOptions,
  locationOptions,
  categoryOptions,
  isDirty,
  isSaving,
  hasConflict,
  sectionError,
  noticeMessage,
  noticeError,
  selectedIds,
  eligibleSelectedIds,
  isMarking,
  markError,
  isSelectionActive,
  canToggleSelection,
  eligibleCount,
  onSave,
  onDiscard,
  onAddRow,
  onDuplicateRow,
  onRowFieldChange,
  onRowCategoryFilterChange,
  onRemoveRow,
  onToggleSelection,
  onToggleAllEligible,
  onMarkForImport,
}: {
  drafts: ImportStagedRowDraft[]
  serverRows: StagedInventoryRow[]
  warehouseId: string
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  categoryOptions: CategoryOption[]
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  sectionError: ReactNode
  noticeMessage?: ReactNode
  noticeError?: ReactNode
  selectedIds: Set<string>
  eligibleSelectedIds: string[]
  isMarking: boolean
  markError: ReactNode
  isSelectionActive: boolean
  canToggleSelection: boolean
  eligibleCount: number
  onSave: () => void
  onDiscard: () => void
  onAddRow: () => void
  onDuplicateRow: (index: number) => void
  onRowFieldChange: (
    index: number,
    field: Exclude<keyof Omit<ImportStagedRowDraft, "clientId">, "categoryFilterId">,
    value: string,
  ) => void
  onRowCategoryFilterChange: (index: number, categoryId: string | null) => void
  onRemoveRow: (index: number) => void
  onToggleSelection: (id: string) => void
  onToggleAllEligible: () => void
  onMarkForImport: () => void
}) {
  const serverRowsById = new Map(serverRows.map((row) => [row.id, row]))
  const filteredLocations = warehouseId
    ? locationOptions.filter((location) => location.warehouseId === warehouseId)
    : locationOptions
  const locationCellOptions = filteredLocations.map((location) => ({
    value: location.id,
    label: location.label,
  }))
  const categoryCellOptions = categoryOptions.map((category) => ({
    id: category.id,
    label: category.label,
  }))

  const gridRows: GridDraftRow[] = drafts.map((row) => ({ ...row, id: row.clientId }))

  function findIndex(clientId: string) {
    return drafts.findIndex((draft) => draft.clientId === clientId)
  }

  function isRowLocked(row: GridDraftRow) {
    return serverRowsById.get(row.clientId)?.status === "QUEUED"
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Staged Inventory Rows"
        summary={
          <span>
            {drafts.length} row{drafts.length === 1 ? "" : "s"}
            {selectedIds.size > 0
              ? ` · ${selectedIds.size} selected (${eligibleSelectedIds.length} eligible)`
              : ""}
          </span>
        }
        status={
          eligibleSelectedIds.length > 0
            ? { tone: "processing", label: "Ready to queue", detail: "Worker will materialize on Run" }
            : undefined
        }
        extraActions={
          <SelectAllButton
            isSelectionActive={isSelectionActive}
            selectedCount={selectedIds.size}
            eligibleCount={eligibleCount}
            canSelect={canToggleSelection}
            onToggle={onToggleAllEligible}
          />
        }
        actions={[
          {
            key: "add",
            label: "Add Row",
            onClick: onAddRow,
            kind: "secondary",
            disabled: isSaving || isMarking || isSelectionActive,
          },
          {
            key: "discard",
            label: "Discard",
            onClick: onDiscard,
            kind: "secondary",
            disabled: !isDirty || isSaving || isMarking || isSelectionActive,
          },
          {
            key: "save",
            label: isSaving ? "Saving Rows..." : "Save Rows",
            onClick: onSave,
            kind: "primary",
            disabled: !isDirty || isSaving || hasConflict || isMarking || isSelectionActive,
          },
          {
            key: "run",
            label: isMarking ? "Running..." : "Run Import",
            onClick: onMarkForImport,
            kind: "primary",
            disabled: eligibleSelectedIds.length === 0 || isMarking || isSaving || isDirty,
          },
        ]}
        message={noticeMessage}
        error={sectionError ?? markError ?? noticeError}
      />

      <Grid<GridDraftRow>
        rows={gridRows}
        layout={STAGED_ROWS_LAYOUT}
        empty={<GridEmpty>No staged inventory rows have been added yet.</GridEmpty>}
        renderCell={(column, row) => {
          const locked = isRowLocked(row)
          // Per-row data cells lock when the section is in selection mode —
          // any checked box freezes edits across the whole grid until the
          // user clears the selection or fires the batch. Closes the gap
          // where the in-flight batch could dispatch against stale snapshots
          // edited mid-prep.
          const editable = !locked && !isSelectionActive
          const index = findIndex(row.clientId)
          const selectedProduct = productOptions.find((product) => product.id === row.productId)
          const visibleProducts = row.categoryFilterId
            ? productOptions.filter(
                (product) =>
                  product.categoryId === row.categoryFilterId || product.id === row.productId,
              )
            : productOptions

          switch (column.key) {
            case "categoryFilter":
              return (
                <DropdownCell
                  editable={editable}
                  value={row.categoryFilterId}
                  onChange={(next) => onRowCategoryFilterChange(index, next)}
                  options={categoryCellOptions}
                  allowClear
                  placeholder="All categories"
                  ariaLabel={`Row ${index + 1} category filter`}
                />
              )
            case "product":
              return (
                <DropdownCell
                  editable={editable}
                  value={row.productId || null}
                  onChange={(next) => onRowFieldChange(index, "productId", next ?? "")}
                  options={visibleProducts.map((product) => ({ id: product.id, label: product.label }))}
                  placeholder="Select product"
                  ariaLabel={`Row ${index + 1} product`}
                />
              )
            case "itemNumber":
              return (
                <TextCell
                  editable={editable}
                  value={row.itemNumber}
                  onChange={(value) => onRowFieldChange(index, "itemNumber", value)}
                  ariaLabel={`Row ${index + 1} item number`}
                />
              )
            case "startingStock":
              return (
                <UnitCell
                  editable={editable}
                  value={row.startingStock}
                  onChange={(value) => onRowFieldChange(index, "startingStock", value)}
                  unit={selectedProduct?.stockUnit ?? "unit"}
                  ariaLabel={`Row ${index + 1} starting stock`}
                />
              )
            case "location":
              return (
                <SelectCell
                  editable={editable}
                  value={row.locationId}
                  onChange={(value) => onRowFieldChange(index, "locationId", value)}
                  options={locationCellOptions}
                  placeholder="Select location"
                  ariaLabel={`Row ${index + 1} location`}
                />
              )
            case "dyeLot":
              return (
                <TextCell
                  editable={editable}
                  value={row.dyeLot}
                  onChange={(value) => onRowFieldChange(index, "dyeLot", value)}
                  ariaLabel={`Row ${index + 1} dye lot`}
                />
              )
            case "notes":
              return (
                <TextCell
                  editable={editable}
                  value={row.notes}
                  onChange={(value) => onRowFieldChange(index, "notes", value)}
                  ariaLabel={`Row ${index + 1} notes`}
                />
              )
            default:
              return null
          }
        }}
        renderControl={(control, row) => {
          const locked = isRowLocked(row)
          const serverRow = serverRowsById.get(row.clientId)
          const serverStatus = serverRow?.status ?? null
          const isServerRow = Boolean(serverRow)
          const index = findIndex(row.clientId)

          if (control.kind === "selection") {
            // Gate per-row checkbox on `canToggleSelection` so users can't
            // mark rows for import while the section is dirty (would
            // silently abandon unsaved edits when the batch fires).
            return (
              <CheckboxCell
                editable={canToggleSelection && isServerRow && !locked}
                value={selectedIds.has(row.clientId)}
                onChange={() => onToggleSelection(row.clientId)}
                ariaLabel={`Select row ${index + 1}`}
              />
            )
          }
          if (control.kind === "status-indicator") {
            return (
              <StatusBadge tone={statusTone(serverStatus)}>{statusLabel(serverStatus)}</StatusBadge>
            )
          }
          if (control.kind === "actions") {
            const editable = !locked && !isSelectionActive
            return (
              <div className="flex items-center gap-1">
                <DuplicateRowButton
                  ariaLabel={`Duplicate row ${index + 1}`}
                  title={editable ? "Duplicate this row" : "Locked while section is busy"}
                  editable={editable}
                  onClick={() => onDuplicateRow(index)}
                />
                <RowActionButton
                  label="✕"
                  ariaLabel={`Remove row ${index + 1}`}
                  tone="destructive"
                  title={!locked ? "Remove this row" : "Locked"}
                  editable={!locked}
                  onClick={() => onRemoveRow(index)}
                />
              </div>
            )
          }
          return null
        }}
      />
    </div>
  )
}
