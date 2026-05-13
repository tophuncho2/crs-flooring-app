"use client"

import { Fragment, useCallback, useMemo } from "react"
import type { ReactNode } from "react"
import { ActionHeader } from "@/components/headers"
import { RowActionButton, UnitCell } from "@/components/cells"
import { ExpandableRow } from "@/components/grid/expandable-rows"
import { SelectAllButton } from "@/components/features/select-batch"
import { Grid, GridEmpty } from "@/components/grid"
import { CategoryPicker } from "@/modules/categories/components/picker/category-picker"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { isLocalOnlyRecordRow } from "@/modules/shared/engines/record-view"
import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import {
  useImportStagedInventoryFilterRowsSection,
  type StagedInvRowPanelPatch,
} from "@/modules/imports/controllers/record/staged-inventory-filter-rows/use-import-staged-inventory-filter-rows-section"
import { useStagedInvRowEditPanel } from "@/modules/imports/controllers/record/staged-inventory-filter-rows/use-staged-inv-row-edit-panel"
import type { ImportFilterRowDraft } from "@/modules/imports/controllers/record/drafts"
import { FILTER_ROW_LAYOUT } from "./filter-row-layout"
import { StagedInvRowSubGrid } from "./staged-inv-row-sub-grid"
import { StagedInvRowEditPanel } from "./staged-inv-row-edit-panel/staged-inv-row-edit-panel"

type FilterDraftRow = ImportFilterRowDraft & { id: string }

export function ImportStagedInventoryFilterRowsSection({
  record,
  filterRows,
  stagedRows,
  publishFilterRows,
  publishStagedRows,
  publishMarkedForImport,
}: {
  record: ImportDetail
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
  publishFilterRows: (rows: StagedInventoryFilterRow[]) => void
  publishStagedRows: (rows: StagedInventoryRow[]) => void
  publishMarkedForImport: (markedIds: string[]) => void
}) {
  const section = useImportStagedInventoryFilterRowsSection({
    record,
    filterRows,
    stagedRows,
    publishFilterRows,
    publishStagedRows,
    publishMarkedForImport,
  })

  const handlePanelPatch = useCallback(
    (patch: StagedInvRowPanelPatch) => section.applyStagedRowPatch(patch),
    [section],
  )

  const panel = useStagedInvRowEditPanel({
    importId: record.id,
    publish: handlePanelPatch,
  })

  // --- Server-snapshot lookups (for read-only computed fields + locks) ---
  const serverFilterRowsById = useMemo(() => {
    const map = new Map<string, StagedInventoryFilterRow>()
    for (const row of filterRows) map.set(row.id, row)
    return map
  }, [filterRows])

  const drafts: FilterDraftRow[] = useMemo(
    () => section.localValue.map((row) => ({ ...row, id: row.clientId })),
    [section.localValue],
  )

  const totalStagedRowCount = stagedRows.length
  const editable = !section.isSaving && !section.isMarking && !section.isSelectionActive
  const sectionError = section.error?.message ?? null

  function renderParentCell(column: { key: string }, draft: FilterDraftRow): ReactNode {
    const server = serverFilterRowsById.get(draft.clientId)
    const hasChildren = (server?.childRowCount ?? 0) > 0
    const isNew = isLocalOnlyRecordRow(draft.clientId)
    const productEditable = editable && !hasChildren
    // Category filter is immutable after the row is saved — symmetric to
    // `FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE` in the domain validator.
    const categoryEditable = editable && isNew
    switch (column.key) {
      case "categoryFilter":
        return (
          <CategoryPicker
            value={draft.categoryFilterId}
            onChange={(next) => section.setFilterCategoryFilter(draft.clientId, next)}
            selectedLabel={server?.categoryFilterName ?? null}
            disabled={!categoryEditable}
            placeholder="All categories"
            ariaLabel="Filter row category"
          />
        )
      case "product":
        return (
          <ProductPicker
            value={draft.productId || null}
            onChange={(next) => section.setFilterField(draft.clientId, "productId", next ?? "")}
            onOptionSelected={(option) => section.setFilterProductSnapshot(draft.clientId, option)}
            categoryId={draft.categoryFilterId}
            selectedLabel={draft.productName || null}
            disabled={!productEditable}
            placeholder="Select product"
            ariaLabel="Filter row product"
          />
        )
      case "stockOrdered":
        return (
          <UnitCell
            editable={editable}
            value={draft.stockOrdered}
            onChange={(next) => section.setFilterField(draft.clientId, "stockOrdered", next)}
            unit={draft.stockUnitAbbrev || server?.stockUnitAbbrev || "unit"}
            ariaLabel="Stock ordered"
          />
        )
      case "remainingStock": {
        const value = server?.remainingStock ?? "—"
        return (
          <span className="text-sm text-[var(--foreground)]/80">
            {value}
            {server?.stockUnitAbbrev ? ` ${server.stockUnitAbbrev}` : ""}
          </span>
        )
      }
      default:
        return null
    }
  }

  function renderParentControl(
    control: { key: string; kind: string },
    draft: FilterDraftRow,
  ): ReactNode {
    if (control.kind === "actions") {
      const server = serverFilterRowsById.get(draft.clientId)
      const hasChildren = (server?.childRowCount ?? 0) > 0
      const isNew = isLocalOnlyRecordRow(draft.clientId)
      const removable = editable && (isNew || !hasChildren)
      return (
        <RowActionButton
          label="✕"
          ariaLabel="Remove filter row"
          tone="destructive"
          title={
            removable
              ? "Remove this filter row"
              : hasChildren
                ? "Has staged rows — remove those first"
                : "Locked while section is busy"
          }
          editable={removable}
          onClick={() => section.removeFilterRow(draft.clientId)}
        />
      )
    }
    return null
  }

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <ActionHeader
        title="Staged Inventory"
        summary={
          <span>
            {drafts.length} filter row{drafts.length === 1 ? "" : "s"} · {totalStagedRowCount}{" "}
            staged row{totalStagedRowCount === 1 ? "" : "s"}
            {section.selectedIds.size > 0
              ? ` · ${section.selectedIds.size} selected (${section.eligibleSelectedIds.length} eligible)`
              : ""}
          </span>
        }
        status={
          section.eligibleSelectedIds.length > 0
            ? {
                tone: "processing",
                label: "Ready to queue",
                detail: "Worker will materialize on Run",
              }
            : undefined
        }
        extraActions={
          <SelectAllButton
            isSelectionActive={section.isSelectionActive}
            selectedCount={section.selectedIds.size}
            eligibleCount={section.eligibleCount}
            canSelect={section.canToggleSelection}
            onToggle={section.toggleAllEligible}
          />
        }
        actions={[
          {
            key: "add",
            label: "Add Filter Row",
            onClick: section.addFilterRow,
            kind: "secondary",
            disabled: section.isSaving || section.isMarking || section.isSelectionActive,
          },
          {
            key: "discard",
            label: "Discard",
            onClick: () => section.discard(),
            kind: "secondary",
            disabled:
              !section.isDirty ||
              section.isSaving ||
              section.isMarking ||
              section.isSelectionActive,
          },
          {
            key: "save",
            label: section.isSaving ? "Saving Rows..." : "Save Rows",
            onClick: () => void section.save(),
            kind: "primary",
            disabled:
              !section.isDirty ||
              section.isSaving ||
              section.hasConflict ||
              section.isMarking ||
              section.isSelectionActive,
          },
          {
            key: "run",
            label: section.isMarking ? "Running..." : "Run Import",
            onClick: () => void section.markForImport(),
            kind: "primary",
            disabled:
              section.eligibleSelectedIds.length === 0 ||
              section.isMarking ||
              section.isSaving ||
              section.isDirty,
          },
        ]}
        message={section.noticeMessage}
        error={sectionError ?? section.markError ?? section.noticeError}
      />

      <Grid<FilterDraftRow>
        rows={drafts}
        layout={FILTER_ROW_LAYOUT}
        empty={<GridEmpty>No filter rows yet. Add one to start staging inventory.</GridEmpty>}
        renderRow={(draft) => {
          const server = serverFilterRowsById.get(draft.clientId)
          const childRows = server ? (section.stagedRowsByFilterId.get(server.id) ?? []) : []
          return (
            <Fragment>
              <ExpandableRow<FilterDraftRow>
                parentRow={draft}
                parentLayout={FILTER_ROW_LAYOUT}
                expanded={true}
                renderParentCell={renderParentCell}
                renderParentControl={renderParentControl}
                accentTone="sky"
              >
                {server ? (
                  <div className="px-4 py-3">
                    <StagedInvRowSubGrid
                      filterRow={server}
                      rows={childRows}
                      selectedIds={section.selectedIds}
                      canToggleSelection={section.canToggleSelection}
                      isSectionBusy={
                        section.isSaving ||
                        section.isMarking ||
                        section.isSelectionActive ||
                        section.isDuplicating
                      }
                      onOpenEdit={(row, filterRow) =>
                        panel.openPanel({ mode: "edit", row, filterRow })
                      }
                      onCreateNew={(filterRow) =>
                        panel.openPanel({
                          mode: "create",
                          filterRowId: filterRow.id,
                          filterRowProductName: filterRow.productName,
                          filterRowStockUnitAbbrev: filterRow.stockUnitAbbrev,
                        })
                      }
                      onDuplicate={(row) => section.duplicateStagedRow(row)}
                      onToggleSelection={section.toggleSelection}
                    />
                  </div>
                ) : (
                  <div className="px-4 py-3 text-xs text-[var(--foreground)]/55">
                    Save this filter row to add staged inventory rows.
                  </div>
                )}
              </ExpandableRow>
            </Fragment>
          )
        }}
      />

      <StagedInvRowEditPanel controller={panel} />
    </div>
  )
}
