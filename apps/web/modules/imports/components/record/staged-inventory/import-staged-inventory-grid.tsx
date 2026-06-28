"use client"

import { useMemo, useState } from "react"
import { Plus } from "lucide-react"
import {
  computeFilterRemainingStock,
  type FlooringStagedRowStatus,
} from "@builders/domain"
import { CellAddButton, StatusBadge, type BadgeTone } from "@/engines/common"
import { MoneyCell, TextCell, UnitCell, isLocalOnlyRecordRow } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import {
  resolveEffectiveStatus,
  type ImportFilterRowDraft,
  type ImportStagedRowDraft,
} from "@/modules/imports/controllers/record/drafts"
import type { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import { StagedRowDuplicateButton, StagedRowRemoveButton } from "./row-controls"

type StagedGridRow = ImportStagedRowDraft & { id: string }

type StagedGroup = {
  productId: string
  productName: string
  stockUnitAbbrev: string
  /**
   * The combined planned ordered quantity for this product — the SUM of
   * `stockOrdered` across every Planned Import (filter row) sharing the
   * productId — or "" if none of them carry a value. A product may now appear
   * on multiple planned imports, so the Staged view collapses them into one
   * group whose Requested is their total.
   */
  stockOrdered: string
  rows: ImportStagedRowDraft[]
}

const STAGED_COLUMNS: DataTableColumn<StagedGridRow>[] = [
  { key: "status", label: "Status", width: 120, align: "center" },
  { key: "rollNumber", label: "Roll #", minWidth: 150, grow: 0.8 },
  { key: "startingStock", label: "Starting Stock", width: 160, align: "end" },
  { key: "cost", label: "Cost", width: 130, align: "end" },
  { key: "freight", label: "Freight", width: 130, align: "end" },
  { key: "dyeLot", label: "Dye Lot", minWidth: 130, grow: 0.6 },
  { key: "location", label: "Location", minWidth: 140, grow: 0.6 },
  { key: "note", label: "Note", minWidth: 220, grow: 1.4 },
]

// The "unassigned" group (a section-level blank add, productId "") leads with an
// inline product picker so the user chooses a product before the row can save.
// Once picked, the row regroups under its product and uses STAGED_COLUMNS.
const STAGED_COLUMNS_WITH_PRODUCT: DataTableColumn<StagedGridRow>[] = [
  { key: "product", label: "Product", minWidth: 240, grow: 1.4 },
  ...STAGED_COLUMNS,
]

// Two row controls (duplicate + delete) share the gutter — wider than the
// single-icon default.
const STAGED_GUTTER_WIDTH = 92

function statusTone(status: FlooringStagedRowStatus): BadgeTone {
  switch (status) {
    case "QUEUED":
      return "processing"
    case "IMPORTED":
      return "success"
    default:
      return "default"
  }
}

function statusLabel(status: FlooringStagedRowStatus): string {
  switch (status) {
    case "QUEUED":
      return "Queued"
    case "IMPORTED":
      return "Imported"
    default:
      return "Draft"
  }
}

/**
 * Group staged rows by product over the union of planned imports (filters) AND
 * staged rows — so a planned product with zero staged rows still gets a header
 * (its Requested total + the "+" create affordance), and a staged row whose
 * product has no planned import still surfaces in its own group. Mirrors the WO
 * adjustments grid's `groupByProduct`. Groups run product-name ascending.
 */
function buildGroups(
  filters: ReadonlyArray<ImportFilterRowDraft>,
  stagedRows: ReadonlyArray<ImportStagedRowDraft>,
): StagedGroup[] {
  const groups: StagedGroup[] = []
  const byId = new Map<string, StagedGroup>()
  const ensure = (productId: string, productName: string, stockUnitAbbrev: string) => {
    let group = byId.get(productId)
    if (!group) {
      group = { productId, productName, stockUnitAbbrev, stockOrdered: "", rows: [] }
      byId.set(productId, group)
      groups.push(group)
    }
    return group
  }
  for (const filter of filters) {
    if (!filter.productId) continue
    const group = ensure(filter.productId, filter.productName, filter.stockUnitAbbrev)
    // Combine duplicate planned imports for the same product: SUM their ordered
    // quantities (skip blanks so an all-blank group stays "" → renders "—").
    const ordered = Number(filter.stockOrdered)
    if (filter.stockOrdered.trim() !== "" && Number.isFinite(ordered)) {
      group.stockOrdered = ((Number(group.stockOrdered) || 0) + ordered).toFixed(2)
    }
  }
  for (const row of stagedRows) {
    ensure(row.productId, row.productName, row.stockUnitAbbrev).rows.push(row)
  }
  groups.sort((a, b) => a.productName.localeCompare(b.productName))
  return groups
}

/**
 * "Staged Inventory" view: the staged rows grouped by product into stacked
 * blocks. Each block is an editable DataTable (DRAFT rows editable; QUEUED /
 * IMPORTED read-only) closed under a per-product header that shows the planned
 * "Requested" + live "Remaining" and a "+" to add a row seeded with the group's
 * product. The mark-for-import checkbox column rides alongside the editable
 * cells + the duplicate/delete gutter.
 */
export function ImportStagedInventoryGrid({
  section,
  serverStatusById,
}: {
  section: ReturnType<typeof useImportStagedInventorySection>
  serverStatusById: Map<string, FlooringStagedRowStatus>
}) {
  const { filters, stagedRows } = section.localValue
  const groups = useMemo(() => buildGroups(filters, stagedRows), [filters, stagedRows])

  const isSectionBusy = section.isSaving || section.isMarking || section.isSelectionActive

  // Per-row category narrowing for the inline product picker on blank rows.
  // UI-only (never persisted on a staged row) — keyed by the row's stable
  // clientId so it survives the regroup once a product is picked.
  const [categoryByClientId, setCategoryByClientId] = useState<
    Record<string, string | null>
  >({})

  const effectiveStatus = (draft: ImportStagedRowDraft): FlooringStagedRowStatus =>
    resolveEffectiveStatus(serverStatusById, draft)

  // Live sum of staged startingStock per product, for the "Remaining" header.
  const startingStockSumByProductId = useMemo(() => {
    const map = new Map<string, number>()
    for (const row of stagedRows) {
      const parsed = Number(row.startingStock)
      if (!Number.isFinite(parsed)) continue
      map.set(row.productId, (map.get(row.productId) ?? 0) + parsed)
    }
    return map
  }, [stagedRows])

  function renderCell(column: { key: string }, gridRow: StagedGridRow) {
    const status = effectiveStatus(gridRow)
    const editable = status === "DRAFT" && !isSectionBusy
    switch (column.key) {
      case "product":
        return (
          <ProductCategoryPicker
            productId={gridRow.productId || null}
            productLabel={gridRow.productName || null}
            onProductChange={(next) =>
              section.setStagedRowProductId(gridRow.clientId, next ?? "")
            }
            onProductOptionSelected={(option) =>
              section.setStagedRowProductSnapshot(gridRow.clientId, option)
            }
            categoryId={categoryByClientId[gridRow.clientId] ?? null}
            onCategoryChange={(next) =>
              setCategoryByClientId((prev) => ({ ...prev, [gridRow.clientId]: next }))
            }
            productEditable={editable}
            categoryEditable={editable}
            ariaLabel="Staged inventory product"
          />
        )
      case "status":
        return <StatusBadge tone={statusTone(status)}>{statusLabel(status)}</StatusBadge>
      case "rollNumber":
        return (
          <TextCell
            editable={editable}
            value={gridRow.rollNumber}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "rollNumber", next)}
            ariaLabel="Roll number"
          />
        )
      case "startingStock":
        return (
          <UnitCell
            editable={editable}
            value={gridRow.startingStock}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "startingStock", next)}
            unit={gridRow.stockUnitAbbrev || "unit"}
            ariaLabel="Starting stock"
          />
        )
      case "cost":
        return (
          <MoneyCell
            editable={editable}
            value={gridRow.cost}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "cost", next)}
            ariaLabel="Cost"
          />
        )
      case "freight":
        return (
          <MoneyCell
            editable={editable}
            value={gridRow.freight}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "freight", next)}
            ariaLabel="Freight"
          />
        )
      case "dyeLot":
        return (
          <TextCell
            editable={editable}
            value={gridRow.dyeLot}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "dyeLot", next)}
            ariaLabel="Dye lot"
          />
        )
      case "location":
        return (
          <TextCell
            editable={editable}
            value={gridRow.location}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "location", next)}
            ariaLabel="Location"
          />
        )
      case "note":
        return (
          <TextCell
            editable={editable}
            value={gridRow.note}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "note", next)}
            ariaLabel="Note"
          />
        )
      default:
        return null
    }
  }

  if (groups.length === 0) {
    return (
      <div className="border border-[var(--panel-border)] bg-[var(--panel-border)]/5 px-4 py-8 text-center text-sm text-[var(--foreground)]/65">
        No staged inventory yet. Use “Add Staged Inventory” above, or add a planned import and “+” a row under it.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        // The "unassigned" group collects section-level blank adds (productId
        // ""): no planned import, no Requested/Remaining, an inline product
        // picker column. A row regroups under its product once one is picked.
        const isUnassigned = group.productId === ""
        const sum = startingStockSumByProductId.get(group.productId) ?? 0
        const remaining = computeFilterRemainingStock({
          stockOrdered: group.stockOrdered,
          childStartingStockSum: sum.toFixed(2),
        })
        const rows: StagedGridRow[] = group.rows.map((row) => ({ ...row, id: row.clientId }))
        return (
          <div
            key={group.productId || "__unassigned__"}
            className="space-y-2 border-b border-[var(--panel-border)] pb-5 last:border-b-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="flex items-center gap-2">
                {isUnassigned ? null : (
                  <CellAddButton
                    onClick={() =>
                      section.addStagedRowDraft({
                        productId: group.productId,
                        productName: group.productName,
                        stockUnitAbbrev: group.stockUnitAbbrev,
                      })
                    }
                    ariaLabel={`Add staged row for ${group.productName}`}
                    title="Add a staged row for this product"
                    disabled={isSectionBusy}
                    className="h-8 w-8"
                    icon={<Plus size={18} aria-hidden="true" />}
                  />
                )}
                <span className="text-base font-semibold text-[var(--foreground)]">
                  {isUnassigned ? "New staged inventory" : group.productName}
                </span>
              </span>
              {isUnassigned ? null : (
                <span className="flex items-center gap-4 text-base uppercase tracking-wide text-[var(--foreground)]/55">
                  <span>
                    <span className="font-bold">Requested</span>{" "}
                    <span className="tabular-nums text-sky-700/80">
                      {group.stockOrdered || "—"}
                      {group.stockOrdered && group.stockUnitAbbrev
                        ? ` ${group.stockUnitAbbrev}`
                        : ""}
                    </span>
                  </span>
                  <span>
                    <span className="font-bold">Remaining</span>{" "}
                    <span className="tabular-nums text-[var(--foreground)]/80">
                      {remaining || "—"}
                      {remaining && group.stockUnitAbbrev ? ` ${group.stockUnitAbbrev}` : ""}
                    </span>
                  </span>
                </span>
              )}
            </div>
            {rows.length > 0 ? (
              <DataTable<StagedGridRow>
                variant="editable"
                rows={rows}
                columns={isUnassigned ? STAGED_COLUMNS_WITH_PRODUCT : STAGED_COLUMNS}
                rowActionsWidth={STAGED_GUTTER_WIDTH}
                selection={{
                  selectedIds: section.selectedIds,
                  onToggleRow: section.toggleSelection,
                  canToggleSelection: section.canToggleSelection,
                  // Mark-for-import operates on saved DRAFT rows only.
                  isRowSelectable: (row) =>
                    !isLocalOnlyRecordRow(row.clientId) && effectiveStatus(row) === "DRAFT",
                }}
                getRowAriaLabel={(row) => `Select staged row ${row.rollNumber || row.clientId}`}
                rowActions={(row) => {
                  const isDraft = effectiveStatus(row) === "DRAFT"
                  return (
                    <>
                      <StagedRowDuplicateButton
                        isDraft={isDraft}
                        isSectionBusy={isSectionBusy}
                        onClick={() => section.duplicateStagedRowDraft(row.clientId)}
                      />
                      <StagedRowRemoveButton
                        isDraft={isDraft}
                        isSectionBusy={isSectionBusy}
                        onClick={() => section.removeStagedRowDraft(row.clientId)}
                      />
                    </>
                  )
                }}
                renderCell={renderCell}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
