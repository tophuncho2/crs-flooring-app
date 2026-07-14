"use client"

import { useMemo } from "react"
import { NumberCell } from "@/engines/record-view"
import { DataTable, type DataTableColumn } from "@/engines/list-view"
import { ProductCategoryPicker } from "@/modules/products/components/picker/product-category-picker"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import { ConversionFormulaPicker } from "@/modules/conversion-formulas/components/picker/conversion-formula-picker"
import type { StagedInventoryFilterRow } from "@builders/domain"
import type { ImportFilterRowDraft } from "@/modules/imports/controllers/record/drafts"
import type { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import { PlannedImportRemoveButton } from "./row-controls"

type PlannedImportGridRow = ImportFilterRowDraft & { id: string }

const PLANNED_IMPORT_COLUMNS: DataTableColumn<PlannedImportGridRow>[] = [
  // Product is the sole grow column, so it absorbs all leftover width and
  // stretches right; Stock Ordered stays pinned at 170 (just pushed right) and
  // Unit is pinned just barely wider than it.
  { key: "product", label: "Product", minWidth: 260, grow: 1 },
  { key: "stockOrdered", label: "Stock Ordered", width: 170, align: "end" },
  { key: "unit", label: "Unit", width: 185 },
  { key: "coveragePerUnit", label: "Coverage / Unit", width: 150, align: "end" },
  { key: "coverageUnit", label: "Coverage Unit", width: 170 },
  { key: "conversionFormula", label: "Conversion Formula", minWidth: 200, grow: 0.8 },
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
            // Category is transient product-narrowing only (not persisted), so
            // it's editable whenever the row is; the chip derives from the
            // picked product (mirrors templates / work-orders material items).
            categoryEditable={editable}
            showProductCategory
            ariaLabel="Planned import product"
          />
        )
      case "unit":
        return (
          <UnitOfMeasurePicker
            value={draft.unitId || null}
            selectedLabel={draft.unitName || server?.unitName || null}
            onChange={(id) => section.setFilterField(draft.clientId, "unitId", id ?? "")}
            onOptionSelected={(option) => section.setFilterUnit(draft.clientId, option)}
            disabled={!editable}
            ariaLabel="Planned import unit"
          />
        )
      case "stockOrdered":
        return (
          <NumberCell
            editable={editable}
            value={draft.stockOrdered}
            onChange={(next) => section.setFilterField(draft.clientId, "stockOrdered", next)}
            placeholder="—"
            ariaLabel="Stock ordered"
          />
        )
      case "coveragePerUnit":
        return (
          <NumberCell
            editable={editable}
            value={draft.coveragePerUnit}
            onChange={(next) => section.setFilterField(draft.clientId, "coveragePerUnit", next)}
            placeholder="—"
            ariaLabel="Coverage per unit"
          />
        )
      case "coverageUnit":
        return (
          <UnitOfMeasurePicker
            value={draft.coverageUnitId || null}
            selectedLabel={draft.coverageUnitName || null}
            onChange={() => {}}
            onOptionSelected={(option) => section.setFilterCoverageUnit(draft.clientId, option)}
            disabled={!editable}
            placeholder="Coverage unit"
            ariaLabel="Coverage unit"
          />
        )
      case "conversionFormula":
        return (
          <ConversionFormulaPicker
            value={draft.conversionFormulaId || null}
            selectedLabel={draft.conversionFormulaName || null}
            onChange={() => {}}
            onOptionSelected={(option) => section.setFilterFormula(draft.clientId, option)}
            disabled={!editable}
            ariaLabel="Conversion formula"
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
