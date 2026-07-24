"use client"

import { useMemo } from "react"
import { Plus } from "lucide-react"
import {
  computeFilterRemainingStock,
  type FlooringStagedRowStatus,
} from "@builders/domain"
import { CellAddButton, StatusBadge, type BadgeTone } from "@/engines/common"
import { NumberCell, TextCell, isLocalOnlyRecordRow } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import { ConversionFormulaPicker } from "@/modules/conversion-formulas/components/picker/conversion-formula-picker"
import {
  resolveEffectiveStatus,
  type ImportFilterRowDraft,
  type ImportStagedRowDraft,
} from "@/modules/imports/controllers/record/drafts"
import type { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import { StagedRowDuplicateButton, StagedRowRemoveButton } from "./row-controls"

type StagedGridRow = ImportStagedRowDraft & { id: string }

// Grouping is keyed on (productId, unitId) — the same product at two units groups
// SEPARATELY so summed Requested/Remaining never mix units (UoM epic). A missing
// unit coalesces to "" (one unitless bucket).
const groupKey = (productId: string, unitId: string) => `${productId}::${unitId ?? ""}`

type StagedGroup = {
  productId: string
  productName: string
  // Product's default unit (UoM epic 2B) — seeds a newly added staged row.
  unitId: string
  unitName: string
  unitAbbrev: string
  // Conversion trio (+ labels) — seeds a newly added staged row from whichever
  // filter/staged row first established this group (they carry the product's
  // seeded defaults; all editable thereafter).
  coverageUnitId: string
  coverageUnitName: string
  coverageUnitAbbrev: string
  coveragePerUnit: string
  conversionFormulaId: string
  conversionFormulaName: string
  /**
   * The combined planned ordered quantity for this product — the SUM of
   * `stockOrdered` across every Planned Import (filter row) sharing the
   * productId — or "" if none of them carry a value. A product may now appear
   * on multiple planned imports, so the Staged view collapses them into one
   * group whose Requested is their total.
   */
  stockOrdered: string
  /**
   * Live sum of this group's staged-row `startingStock` — the "Remaining"
   * subtrahend (`ordered − this`). Accumulated in-place while the group is built
   * (mirrors `stockOrdered`), so it is ALWAYS the sum of the rows this exact
   * group holds and can never mis-join a separately-keyed lookup map. A staged
   * row lands in the group whose (productId, unitId) key matches its own, so
   * this sum is unit-correct by construction.
   */
  startingStockSum: number
  rows: ImportStagedRowDraft[]
}

// Cost + freight are intentionally absent — hidden from the UI (the modal omits
// them too). The backend Decimal columns + materialize mapping stay intact; rows
// just default them empty.
const STAGED_COLUMNS: DataTableColumn<StagedGridRow>[] = [
  { key: "status", label: "Status", width: 120, align: "center" },
  { key: "rollNumber", label: "Roll #", minWidth: 150, grow: 0.8 },
  { key: "startingStock", label: "Starting Stock", width: 160, align: "end" },
  { key: "unit", label: "Unit", minWidth: 150, grow: 0.7 },
  { key: "dyeLot", label: "Dye Lot", minWidth: 130, grow: 0.6 },
  { key: "location", label: "Location", minWidth: 140, grow: 0.6 },
  { key: "note", label: "Note", minWidth: 220, grow: 1.4 },
  { key: "coveragePerUnit", label: "Coverage / Unit", width: 150, align: "end" },
  { key: "coverageUnit", label: "Coverage Unit", minWidth: 150, grow: 0.7 },
  { key: "conversionFormula", label: "Conversion Formula", minWidth: 200, grow: 1 },
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
  // Both draft shapes share the identity + unit + conversion field names, so one
  // seed accessor covers filter rows and staged rows alike.
  const ensure = (seed: ImportFilterRowDraft | ImportStagedRowDraft) => {
    const key = groupKey(seed.productId, seed.unitId)
    let group = byId.get(key)
    if (!group) {
      group = {
        productId: seed.productId,
        productName: seed.productName,
        unitId: seed.unitId,
        unitName: seed.unitName,
        unitAbbrev: seed.unitAbbrev,
        coverageUnitId: seed.coverageUnitId,
        coverageUnitName: seed.coverageUnitName,
        coverageUnitAbbrev: seed.coverageUnitAbbrev,
        coveragePerUnit: seed.coveragePerUnit,
        conversionFormulaId: seed.conversionFormulaId,
        conversionFormulaName: seed.conversionFormulaName,
        stockOrdered: "",
        startingStockSum: 0,
        rows: [],
      }
      byId.set(key, group)
      groups.push(group)
    }
    return group
  }
  for (const filter of filters) {
    if (!filter.productId) continue
    const group = ensure(filter)
    // Combine duplicate planned imports for the same product: SUM their ordered
    // quantities (skip blanks so an all-blank group stays "" → renders "—").
    const ordered = Number(filter.stockOrdered)
    if (filter.stockOrdered.trim() !== "" && Number.isFinite(ordered)) {
      group.stockOrdered = ((Number(group.stockOrdered) || 0) + ordered).toFixed(2)
    }
  }
  for (const row of stagedRows) {
    const group = ensure(row)
    group.rows.push(row)
    // Fold startingStock into the group's live sum here — same in-place pattern
    // as `stockOrdered` above — so "Remaining" reads off the group it belongs to.
    const parsed = Number(row.startingStock)
    if (Number.isFinite(parsed)) group.startingStockSum += parsed
  }
  // Within a group, show rows newest→oldest. Server rows arrive createdAt-asc and
  // new local drafts append to the end, so reversing puts the most recently added
  // row on top — directly under the group header's "+" (and the modal-seeded add).
  for (const group of groups) group.rows.reverse()
  groups.sort((a, b) => a.productName.localeCompare(b.productName))
  return groups
}

/**
 * "Staged Inventory" view: the staged rows grouped by product into stacked
 * blocks. Each block is an editable DataTable (rows editable in any state except
 * QUEUED — QUEUED is locked mid-import) closed under a per-product header that shows the planned
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

  const effectiveStatus = (draft: ImportStagedRowDraft): FlooringStagedRowStatus =>
    resolveEffectiveStatus(serverStatusById, draft)

  function renderCell(column: { key: string }, gridRow: StagedGridRow) {
    const status = effectiveStatus(gridRow)
    const editable = status !== "QUEUED" && !isSectionBusy
    switch (column.key) {
      case "status":
        return <StatusBadge tone={statusTone(status)}>{statusLabel(status)}</StatusBadge>
      case "unit":
        return (
          <UnitOfMeasurePicker
            value={gridRow.unitId || null}
            selectedLabel={gridRow.unitName || null}
            onChange={(id) => section.setStagedRowField(gridRow.clientId, "unitId", id ?? "")}
            onOptionSelected={(option) => section.setStagedRowUnit(gridRow.clientId, option)}
            disabled={!editable}
            ariaLabel="Select a unit"
          />
        )
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
          <NumberCell
            editable={editable}
            value={gridRow.startingStock}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "startingStock", next)}
            ariaLabel="Starting stock"
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
      case "coveragePerUnit":
        return (
          <NumberCell
            editable={editable}
            value={gridRow.coveragePerUnit}
            onChange={(next) => section.setStagedRowField(gridRow.clientId, "coveragePerUnit", next)}
            ariaLabel="Coverage per unit"
          />
        )
      case "coverageUnit":
        return (
          <UnitOfMeasurePicker
            value={gridRow.coverageUnitId || null}
            selectedLabel={gridRow.coverageUnitName || null}
            onChange={() => {}}
            onOptionSelected={(option) => section.setStagedRowCoverageUnit(gridRow.clientId, option)}
            disabled={!editable}
            placeholder="Coverage unit"
            ariaLabel="Select a coverage unit"
          />
        )
      case "conversionFormula":
        return (
          <ConversionFormulaPicker
            value={gridRow.conversionFormulaId || null}
            selectedLabel={gridRow.conversionFormulaName || null}
            onChange={() => {}}
            onOptionSelected={(option) => section.setStagedRowFormula(gridRow.clientId, option)}
            disabled={!editable}
            ariaLabel="Select a conversion formula"
          />
        )
      default:
        return null
    }
  }

  if (groups.length === 0) {
    return (
      <div className="border border-[var(--panel-border)] bg-[var(--panel-border)]/5 px-4 py-8 text-center text-sm text-[var(--foreground)]/65">
        No staged inventory yet. Add the product as a planned import, then use “+” under its group to stage a row.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const remaining = computeFilterRemainingStock({
          stockOrdered: group.stockOrdered,
          childStartingStockSum: group.startingStockSum.toFixed(2),
        })
        const rows: StagedGridRow[] = group.rows.map((row) => ({ ...row, id: row.clientId }))
        return (
          <div
            key={groupKey(group.productId, group.unitId)}
            className="space-y-2 border-b border-[var(--panel-border)] pb-5 last:border-b-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-3 px-1">
              <span className="flex items-center gap-2">
                <CellAddButton
                  onClick={() =>
                    section.addStagedRowDraft({
                      productId: group.productId,
                      productName: group.productName,
                      unitId: group.unitId,
                      unitName: group.unitName,
                      unitAbbrev: group.unitAbbrev,
                      coverageUnitId: group.coverageUnitId,
                      coverageUnitName: group.coverageUnitName,
                      coverageUnitAbbrev: group.coverageUnitAbbrev,
                      coveragePerUnit: group.coveragePerUnit,
                      conversionFormulaId: group.conversionFormulaId,
                      conversionFormulaName: group.conversionFormulaName,
                    })
                  }
                  ariaLabel={`Add staged row for ${group.productName}`}
                  title="Add a staged row for this product"
                  disabled={isSectionBusy}
                  className="h-8 w-8"
                  icon={<Plus size={18} aria-hidden="true" />}
                />
                <span className="text-base font-semibold text-[var(--foreground)]">
                  {group.productName}
                  {group.unitAbbrev || group.unitName ? (
                    <span className="font-normal text-[var(--foreground)]/55">
                      {" · "}
                      {group.unitAbbrev || group.unitName}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="flex items-center gap-4 text-base uppercase tracking-wide text-[var(--foreground)]/55">
                <span>
                  <span className="font-bold">Requested</span>{" "}
                  <span className="tabular-nums text-sky-700/80">
                    {group.stockOrdered || "—"}
                    {group.stockOrdered && group.unitAbbrev
                      ? ` ${group.unitAbbrev}`
                      : ""}
                  </span>
                </span>
                <span>
                  <span className="font-bold">Remaining</span>{" "}
                  <span className="tabular-nums text-[var(--foreground)]/80">
                    {remaining || "—"}
                    {remaining && group.unitAbbrev ? ` ${group.unitAbbrev}` : ""}
                  </span>
                </span>
              </span>
            </div>
            {rows.length > 0 ? (
              <DataTable<StagedGridRow>
                variant="editable"
                flush
                rows={rows}
                columns={STAGED_COLUMNS}
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
                  const isEditable = effectiveStatus(row) !== "QUEUED"
                  return (
                    <>
                      <StagedRowDuplicateButton
                        isEditable={isEditable}
                        isSectionBusy={isSectionBusy}
                        onClick={() => section.duplicateStagedRowDraft(row.clientId)}
                      />
                      <StagedRowRemoveButton
                        isEditable={isEditable}
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
