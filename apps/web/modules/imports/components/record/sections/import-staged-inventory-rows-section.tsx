"use client"

import {
  RecordGridCellDropdown,
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordRowLayout,
  RecordSectionGrid,
  RecordSectionGridRow,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
} from "@/modules/shared/engines/record-view"
import { calculateImportSummary } from "@builders/domain"
import type {
  CategoryOption,
  ImportInventoryRowDraft,
  LocationOption,
  ProductOption,
  WarehouseOption,
} from "@/modules/imports/controllers/drafts"

// Column widths tuned to fit a typical ~1440px viewport without horizontal
// scroll on average row content, and to stay within a reasonable bound when
// scroll is needed. `product` + `notes` keep small grow factors so they
// absorb extra space first; everything else stays at its min-width.
const IMPORT_INVENTORY_ROW_COLUMNS: RecordRowColumnSpec[] = [
  { key: "categoryFilter", minWidth: 132, label: "Filter" },
  { key: "product", minWidth: 220, grow: 1.3, label: "Product" },
  { key: "itemNumber", minWidth: 116, label: "Item #" },
  { key: "stock", minWidth: 156, align: "center", label: "Stock" },
  { key: "location", minWidth: 196, label: "Location" },
  { key: "dyeLot", minWidth: 124, label: "Dye Lot" },
  { key: "cost", minWidth: 116, align: "end", label: "Cost" },
  { key: "freight", minWidth: 116, align: "end", label: "Freight" },
  { key: "notes", minWidth: 240, grow: 1.2, label: "Notes" },
  { key: "importStatus", minWidth: 132, align: "center", label: "Import Status" },
  { key: "remove", minWidth: 100, align: "center", label: "Remove" },
]

export function ImportInventoryRowsSection({
  subHeader,
  rows,
  warehouseId,
  productOptions,
  warehouseOptions: _warehouseOptions,
  locationOptions,
  categoryOptions,
  noticeMessage,
  noticeError,
  onRowFieldChange,
  onRowImportStatusChange,
  onRowCategoryFilterChange,
  onRemoveRow,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  rows: ImportInventoryRowDraft[]
  warehouseId: string
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  categoryOptions: CategoryOption[]
  noticeMessage?: string
  noticeError?: string
  onRowFieldChange: (
    index: number,
    field: Exclude<
      keyof Omit<ImportInventoryRowDraft, "clientId">,
      "isImported" | "categoryFilterId"
    >,
    value: string,
  ) => void
  onRowImportStatusChange: (index: number, isImported: boolean) => void
  onRowCategoryFilterChange: (index: number, categoryId: string | null) => void
  onRemoveRow: (index: number) => void
}) {
  const summary = calculateImportSummary(rows.map((row) => ({
    stockCount: row.stockCount,
    cost: row.cost,
    freight: row.freight,
  })))

  return (
    <RecordItemSection
      title="Import Inventory Rows"
      bodyClassName="space-y-0"
      subHeader={subHeader}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={[
        { label: "Rows", value: String(rows.length) },
        { label: "Total Cost", value: summary.totalCostLabel },
      ]}
      capabilities={{
        editable: true,
        supportsAddRow: true,
        supportsSaveDiscard: true,
        supportsRemoveRow: true,
        supportsStatusColumn: false,
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: true,
      }}
      isEmpty={rows.length === 0}
      emptyState="No import inventory rows have been added yet."
    >
      <RecordSectionGrid
        columns={IMPORT_INVENTORY_ROW_COLUMNS}
        isEmpty={rows.length === 0}
        emptyState="No import inventory rows have been added yet."
      >
        {rows.map((row, index) => {
          const filteredLocations = warehouseId
            ? locationOptions.filter((location) => location.warehouseId === warehouseId)
            : locationOptions
          const selectedProduct = productOptions.find((product) => product.id === row.productId)
          // Row-wide editability: once `isImported = true`, the row is locked.
          // The inventory record view becomes the only edit surface. This mirrors
          // the domain rule `isInventoryCostLocked` for cost/freight (which
          // extends to ALL fields here — single clean handoff).
          const locked = row.isImported
          // Category filter: narrows the product dropdown. ALWAYS includes the
          // currently-selected product so a saved row never renders "broken"
          // just because its category is filtered out.
          const visibleProducts = row.categoryFilterId
            ? productOptions.filter(
                (product) =>
                  product.categoryId === row.categoryFilterId || product.id === row.productId,
              )
            : productOptions

          return (
            <RecordSectionGridRow
              key={row.clientId}
              columns={IMPORT_INVENTORY_ROW_COLUMNS}
              rowTone="default"
            >
              <RecordRowLayout columns={IMPORT_INVENTORY_ROW_COLUMNS}>
                <RecordItemCell columnKey="categoryFilter" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellDropdown
                    ariaLabel={`Import inventory row ${index + 1} category filter`}
                    value={row.categoryFilterId}
                    options={categoryOptions.map((category) => ({ id: category.id, label: category.label }))}
                    placeholder="All categories"
                    allowClear
                    disabled={locked}
                    onChange={(next) => onRowCategoryFilterChange(index, next)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="product" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellSelect
                    aria-label={`Import inventory row ${index + 1} product`}
                    value={row.productId}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "productId", event.target.value)}
                  >
                    <option value="">Select product</option>
                    {visibleProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.label}
                      </option>
                    ))}
                  </RecordGridCellSelect>
                </RecordItemCell>
                <RecordItemCell columnKey="itemNumber" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    aria-label={`Import inventory row ${index + 1} item number`}
                    value={row.itemNumber}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "itemNumber", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="stock" chrome="grid" showLabel={index === 0}>
                  <div className="flex items-center justify-center gap-2">
                    <RecordGridCellInput
                      aria-label={`Import inventory row ${index + 1} stock`}
                      value={row.stockCount}
                      inputMode="decimal"
                      placeholder="0.00"
                      align="center"
                      controlSize="compact"
                      disabled={locked}
                      onChange={(event) => onRowFieldChange(index, "stockCount", event.target.value)}
                    />
                    <span className="text-xs text-[var(--foreground)]/60">{selectedProduct?.stockUnit || "unit"}</span>
                  </div>
                </RecordItemCell>
                <RecordItemCell columnKey="location" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellSelect
                    aria-label={`Import inventory row ${index + 1} location`}
                    value={row.locationId}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "locationId", event.target.value)}
                  >
                    <option value="">Select location</option>
                    {filteredLocations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.label}
                      </option>
                    ))}
                  </RecordGridCellSelect>
                </RecordItemCell>
                <RecordItemCell columnKey="dyeLot" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    aria-label={`Import inventory row ${index + 1} dye lot`}
                    value={row.dyeLot}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "dyeLot", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="cost" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    aria-label={`Import inventory row ${index + 1} cost`}
                    value={row.cost}
                    inputMode="decimal"
                    placeholder="0.00"
                    align="right"
                    controlSize="compact"
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "cost", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="freight" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    aria-label={`Import inventory row ${index + 1} freight`}
                    value={row.freight}
                    inputMode="decimal"
                    placeholder="0.00"
                    align="right"
                    controlSize="compact"
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "freight", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="notes" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    aria-label={`Import inventory row ${index + 1} notes`}
                    value={row.notes}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "notes", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="importStatus" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellSelect
                    aria-label={`Import inventory row ${index + 1} import status`}
                    value={row.isImported ? "FINAL" : "PENDING"}
                    disabled={row.isImported}
                    onChange={(event) =>
                      onRowImportStatusChange(index, event.target.value === "FINAL")
                    }
                  >
                    <option value="PENDING">Pending</option>
                    <option value="FINAL">Final</option>
                  </RecordGridCellSelect>
                </RecordItemCell>
                <RecordItemSectionControls
                  capabilities={{ supportsStatusColumn: false, supportsRemoveRow: true }}
                  cellChrome="grid"
                  showCellLabels={index === 0}
                  remove={{
                    onRemove: () => onRemoveRow(index),
                    disabled: locked,
                  }}
                />
              </RecordRowLayout>
            </RecordSectionGridRow>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
