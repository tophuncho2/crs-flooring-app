"use client"

import { Fragment, useMemo } from "react"
import type { ReactNode } from "react"
import { UnitCell } from "@/components/cells"
import { useExpandableRowsToggle } from "@/controllers/expandable-rows"
import { ExpandableRow, UnsavedParentMessage } from "@/components/grid/expandable-rows"
import { Grid, GridEmpty } from "@/components/grid"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { isLocalOnlyRecordRow } from "@/modules/shared/engines/record-view"
import type {
  ImportDetail,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import type { ImportFilterRowDraft } from "@/modules/imports/controllers/record/drafts"
import { FILTER_ROW_LAYOUT } from "./filter-row-layout"
import { StagedInvRowSubGrid } from "./staged-inv-row-sub-grid"
import { StagedInventorySectionHeader } from "./staged-inventory-section-header"
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

  return (
    <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
      <StagedInventorySectionHeader
        filterRowsCount={drafts.length}
        stagedRowsCount={totalStagedRowCount}
        selectedCount={section.selectedIds.size}
        eligibleSelectedCount={section.eligibleSelectedIds.length}
        eligibleCount={section.eligibleCount}
        canToggleSelection={section.canToggleSelection}
        isSelectionActive={section.isSelectionActive}
        isSaving={section.isSaving}
        isDirty={section.isDirty}
        isMarking={section.isMarking}
        hasConflict={section.hasConflict}
        allExpanded={allExpanded}
        onToggleAll={toggleAll}
        onToggleSelection={section.toggleAllEligible}
        onAddFilterRow={section.addFilterRow}
        onDiscard={() => section.discard()}
        onSave={() => void section.save()}
        onRunImport={() => void section.markForImport()}
        noticeMessage={section.noticeMessage}
        error={sectionError ?? section.markError ?? section.noticeError}
      />

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
    </div>
  )
}
