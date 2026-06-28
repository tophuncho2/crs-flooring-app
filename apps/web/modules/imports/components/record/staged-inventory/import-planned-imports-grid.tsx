"use client"

import { useMemo } from "react"
import { UnitCell, isLocalOnlyRecordRow } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import type { StagedInventoryFilterRow } from "@builders/domain"
import type { ImportFilterRowDraft } from "@/modules/imports/controllers/record/drafts"
import type { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import { PlannedImportRemoveButton } from "./row-controls"

type PlannedImportGridRow = ImportFilterRowDraft & { id: string }

const PLANNED_IMPORT_COLUMNS: DataTableColumn<PlannedImportGridRow>[] = [
  { key: "product", label: "Product", minWidth: 260, grow: 2 },
  { key: "stockOrdered", label: "Stock Ordered", width: 170, align: "end" },
]

/**
 * "Planned Imports" view: the filter rows as a flat editable table — product +
 * the ordered quantity. A product may appear on several planned imports now, so
 * "remaining" is no longer a per-row concept; it lives in the Staged Inventory
 * view's per-product group header (ordered total − staged startingStock sum).
 * Mirrors the WO Requested Material grid.
 */
export function ImportPlannedImportsGrid({
  section,
  serverFilterRowsById,
}: {
  section: ReturnType<typeof useImportStagedInventorySection>
  serverFilterRowsById: Map<string, StagedInventoryFilterRow>
}) {
  const editable = !section.isSaving && !section.isMarking && !section.isSelectionActive

  const rows = useMemo<PlannedImportGridRow[]>(
    () => section.localValue.filters.map((row) => ({ ...row, id: row.clientId })),
    [section.localValue.filters],
  )

  function renderCell(column: { key: string }, draft: PlannedImportGridRow) {
    const server = serverFilterRowsById.get(draft.clientId)
    const isNew = isLocalOnlyRecordRow(draft.clientId)
    switch (column.key) {
      case "product":
        return (
          <ProductCategoryPicker
            productId={draft.productId || null}
            productLabel={draft.productName || null}
            onProductChange={(next) => section.setFilterField(draft.clientId, "productId", next ?? "")}
            onProductOptionSelected={(option) =>
              section.setFilterProductSnapshot(draft.clientId, option)
            }
            categoryId={draft.categoryFilterId}
            categoryLabel={server?.categoryFilterName ?? null}
            onCategoryChange={(next) => section.setFilterCategoryFilter(draft.clientId, next)}
            productEditable={editable}
            // Category filter is immutable after the row is saved.
            categoryEditable={editable && isNew}
            ariaLabel="Planned import product"
          />
        )
      case "stockOrdered":
        return (
          <UnitCell
            editable={editable}
            value={draft.stockOrdered}
            onChange={(next) => section.setFilterField(draft.clientId, "stockOrdered", next)}
            unit={draft.stockUnitAbbrev || server?.stockUnitAbbrev || "unit"}
            placeholder="—"
            ariaLabel="Stock ordered"
          />
        )
      default:
        return null
    }
  }

  return (
    <DataTable<PlannedImportGridRow>
      variant="editable"
      rows={rows}
      columns={PLANNED_IMPORT_COLUMNS}
      empty="No planned imports yet. Add one to start staging inventory."
      rowActions={(draft) => (
        <PlannedImportRemoveButton
          editable={editable}
          onClick={() => section.removeFilterRow(draft.clientId)}
        />
      )}
      renderCell={renderCell}
    />
  )
}
