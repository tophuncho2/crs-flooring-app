"use client"

import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { StatusBadge } from "@/components/badges"
import {
  CheckboxCell,
  CurrencyCell,
  DropdownCell,
  SelectCell,
  TextCell,
  UnitCell,
} from "@/components/cells"
import { Grid, GridEmpty, type GridLayout } from "@/components/grid"
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
    { key: "cost", label: "Cost", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "freight", label: "Freight", kind: "currency", minWidth: 116, grow: 0, align: "end" },
    { key: "notes", label: "Notes", minWidth: 240, grow: 1.2 },
  ],
  trailingControls: [
    { key: "status", kind: "status-indicator", width: 132 },
    { key: "remove", kind: "actions", width: 100 },
  ],
}

function statusTone(status: FlooringStagedRowStatus | null) {
  switch (status) {
    case "QUEUED":
      return "processing" as const
    case "IMPORTED":
      return "success" as const
    default:
      return "default" as const
  }
}

function statusLabel(status: FlooringStagedRowStatus | null): string {
  if (status === null) return "Draft"
  switch (status) {
    case "DRAFT":
      return "Draft"
    case "QUEUED":
      return "Queued"
    case "IMPORTED":
      return "Imported"
  }
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
  onSave,
  onDiscard,
  onAddRow,
  onRowFieldChange,
  onRowCategoryFilterChange,
  onRemoveRow,
  onToggleSelection,
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
  onSave: () => void
  onDiscard: () => void
  onAddRow: () => void
  onRowFieldChange: (
    index: number,
    field: Exclude<keyof Omit<ImportStagedRowDraft, "clientId">, "categoryFilterId">,
    value: string,
  ) => void
  onRowCategoryFilterChange: (index: number, categoryId: string | null) => void
  onRemoveRow: (index: number) => void
  onToggleSelection: (id: string) => void
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
    const serverStatus = serverRowsById.get(row.clientId)?.status ?? null
    return serverStatus !== null && serverStatus !== "DRAFT"
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
        actions={[
          {
            key: "add",
            label: "Add Row",
            onClick: onAddRow,
            kind: "secondary",
            disabled: isSaving || isMarking,
          },
          {
            key: "discard",
            label: "Discard",
            onClick: onDiscard,
            kind: "secondary",
            disabled: !isDirty || isSaving || isMarking,
          },
          {
            key: "save",
            label: isSaving ? "Saving Rows..." : "Save Rows",
            onClick: onSave,
            kind: "primary",
            disabled: !isDirty || isSaving || hasConflict || isMarking,
          },
          {
            key: "run",
            label: isMarking ? "Running..." : "Run Import",
            onClick: onMarkForImport,
            kind: "primary",
            disabled: eligibleSelectedIds.length === 0 || isMarking || isSaving,
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
          const editable = !locked
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
            case "cost":
              return (
                <CurrencyCell
                  editable={editable}
                  value={row.cost}
                  onChange={(value) => onRowFieldChange(index, "cost", value)}
                  ariaLabel={`Row ${index + 1} cost`}
                />
              )
            case "freight":
              return (
                <CurrencyCell
                  editable={editable}
                  value={row.freight}
                  onChange={(value) => onRowFieldChange(index, "freight", value)}
                  ariaLabel={`Row ${index + 1} freight`}
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
            return (
              <CheckboxCell
                editable={isServerRow && !locked}
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
            return (
              <button
                type="button"
                onClick={() => onRemoveRow(index)}
                disabled={locked}
                aria-label={`Remove row ${index + 1}`}
                className="rounded-md border border-rose-500/40 bg-rose-500/10 px-2 py-1 text-xs text-rose-700 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✕
              </button>
            )
          }
          return null
        }}
      />
    </div>
  )
}
