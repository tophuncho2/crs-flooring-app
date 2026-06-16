"use client"

import { Fragment, useMemo } from "react"
import type { ReactNode } from "react"
import { RecordItemSection, UnitCell } from "@/engines/record-view"
import { useExpandableRowsToggle } from "@/engines/record-view"
import { ExpandableRow, UnsavedParentMessage } from "@/engines/record-view"
import { Grid, GridEmpty } from "@/engines/record-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { isLocalOnlyRecordRow } from "@/engines/record-view"
import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import type { ImportFilterRowDraft } from "@/modules/imports/controllers/record/drafts"
import { FILTER_ROW_LAYOUT } from "./filter-row-layout"
import { StagedInvRowSubGrid } from "./staged-inv-row-sub-grid"
import { StagedInventoryExpandToggle, StagedInventorySelectionCluster } from "./toolbar-controls"
import { FilterRowRemoveButton } from "./row-controls"

type FilterDraftRow = ImportFilterRowDraft & { id: string }

export function ImportStagedInventorySection({
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
  const section = useImportStagedInventorySection({
    record,
    filterRows,
    stagedRows,
    publishFilterRows,
    publishStagedRows,
    publishMarkedForImport,
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

  const { allExpanded, toggleAll } = useExpandableRowsToggle()

  function renderParentCell(column: { key: string }, draft: FilterDraftRow): ReactNode {
    const server = serverFilterRowsById.get(draft.clientId)
    const isNew = isLocalOnlyRecordRow(draft.clientId)
    // Children come from the nested draft list, not the server snapshot.
    // Once any child draft exists (local or saved), the parent's product
    // can no longer change — matches FILTER_PRODUCT_LOCKED_WITH_CHILDREN
    // server-side. The server also rejects a same-save product change
    // when a non-deleted child exists.
    const hasDraftChildren = draft.stagedRows.length > 0
    const productEditable = editable && !hasDraftChildren
    // Category filter is immutable after the row is saved — symmetric to
    // `FILTER_CATEGORY_FILTER_LOCKED_AFTER_CREATE` in the domain
    // validator.
    const categoryEditable = editable && isNew
    switch (column.key) {
      case "product":
        return (
          <ProductCategoryPicker
            productId={draft.productId || null}
            productLabel={draft.productName || null}
            onProductChange={(next) =>
              section.setFilterField(draft.clientId, "productId", next ?? "")
            }
            onProductOptionSelected={(option) =>
              section.setFilterProductSnapshot(draft.clientId, option)
            }
            categoryId={draft.categoryFilterId}
            categoryLabel={server?.categoryFilterName ?? null}
            onCategoryChange={(next) => section.setFilterCategoryFilter(draft.clientId, next)}
            productEditable={productEditable}
            categoryEditable={categoryEditable}
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
      const isNew = isLocalOnlyRecordRow(draft.clientId)
      // Allow remove when: editable AND (it's a brand-new local draft
      // OR the parent has no draft children — matching the server's
      // post-diff delete rule).
      const hasDraftChildren = draft.stagedRows.length > 0
      const removable = editable && (isNew || !hasDraftChildren)
      const title = removable
        ? "Remove this filter row"
        : hasDraftChildren
          ? "Has staged rows — remove those first"
          : "Locked while section is busy"
      return (
        <FilterRowRemoveButton
          editable={removable}
          title={title}
          onClick={() => section.removeFilterRow(draft.clientId)}
        />
      )
    }
    return null
  }

  const selectedCount = section.selectedIds.size
  const eligibleSelectedCount = section.eligibleSelectedIds.length

  return (
    <RecordItemSection
      title="Staged Inventory"
      // `item` sections default these off — unlock the managed Save/Discard
      // path's status pill + the add action. Save/Discard themselves render as
      // custom actions below (canManage:false) so they keep their extra
      // conflict/marking/selection disable guards.
      capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
      noticeMessage={section.noticeMessage}
      subHeader={{
        canManage: false,
        statusLeading: (
          <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
            {drafts.length} filter row{drafts.length === 1 ? "" : "s"} · {totalStagedRowCount} staged row
            {totalStagedRowCount === 1 ? "" : "s"}
            {selectedCount > 0
              ? ` · ${selectedCount} selected (${eligibleSelectedCount} eligible)`
              : ""}
          </span>
        ),
        isDirty: section.isDirty,
        isSaving: section.isSaving,
        hasConflict: section.hasConflict,
        error: sectionError ?? section.markError ?? section.noticeError,
        actionsLeading: (
          <div className="flex items-center gap-2">
            <StagedInventoryExpandToggle
              itemsCount={drafts.length}
              allExpanded={allExpanded}
              onToggle={toggleAll}
            />
            <StagedInventorySelectionCluster
              selection={{
                isSelectionActive: section.isSelectionActive,
                selectedCount,
                eligibleCount: section.eligibleCount,
                canToggleSelection: section.canToggleSelection,
                onToggleSelection: section.toggleAllEligible,
              }}
              runImport={{
                eligibleSelectedCount,
                isMarking: section.isMarking,
                isSaving: section.isSaving,
                isDirty: section.isDirty,
                onRunImport: () => void section.markForImport(),
              }}
            />
          </div>
        ),
        actions: [
          {
            key: "save",
            label: section.isSaving ? "Saving Rows..." : "Save Rows",
            kind: "custom",
            tone: "primary",
            onClick: () => void section.save(),
            disabled:
              !section.isDirty ||
              section.isSaving ||
              section.hasConflict ||
              section.isMarking ||
              section.isSelectionActive,
          },
          {
            key: "discard",
            label: "Discard",
            kind: "custom",
            tone: "neutral",
            onClick: () => section.discard(),
            disabled:
              !section.isDirty || section.isSaving || section.isMarking || section.isSelectionActive,
          },
          {
            key: "add",
            label: "Add Filter Row",
            kind: "add-row",
            tone: "neutral",
            onClick: section.addFilterRow,
            disabled: section.isSaving || section.isMarking || section.isSelectionActive,
          },
        ],
      }}
    >
      <Grid<FilterDraftRow>
        rows={drafts}
        layout={FILTER_ROW_LAYOUT}
        empty={<GridEmpty>No filter rows yet. Add one to start staging inventory.</GridEmpty>}
        renderRow={(draft) => {
          const server = serverFilterRowsById.get(draft.clientId)
          const isExpanded = allExpanded
          return (
            <Fragment>
              <ExpandableRow<FilterDraftRow>
                parentRow={draft}
                parentLayout={FILTER_ROW_LAYOUT}
                expanded={isExpanded}
                renderParentCell={renderParentCell}
                renderParentControl={renderParentControl}
                accentTone="sky"
              >
                {isExpanded ? (
                  server ? (
                    <StagedInvRowSubGrid
                      filterRow={server}
                      drafts={draft.stagedRows}
                      selectedIds={section.selectedIds}
                      canToggleSelection={section.canToggleSelection}
                      isSectionBusy={
                        section.isSaving ||
                        section.isMarking ||
                        section.isSelectionActive
                      }
                      onAddRow={section.addStagedRowDraft}
                      onDuplicate={section.duplicateStagedRowDraft}
                      onDelete={section.removeStagedRowDraft}
                      onSetField={section.setStagedRowField}
                      onToggleSelection={section.toggleSelection}
                    />
                  ) : (
                    <UnsavedParentMessage>
                      Save this filter row to add staged inventory rows.
                    </UnsavedParentMessage>
                  )
                ) : null}
              </ExpandableRow>
            </Fragment>
          )
        }}
      />
    </RecordItemSection>
  )
}
