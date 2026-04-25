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
  RecordRowStatusBadge,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
} from "@/modules/shared/engines/record-view"
import type { FlooringStagedRowStatus, StagedInventoryRow } from "@builders/domain"
import type {
  CategoryOption,
  ImportStagedRowDraft,
  LocationOption,
  ProductOption,
  WarehouseOption,
} from "@/modules/imports/controllers/drafts"

// Column widths tuned to fit a typical ~1440px viewport without horizontal
// scroll on average row content. `product` + `notes` keep small grow factors
// so they absorb extra space first; everything else stays at its min-width.
const IMPORT_STAGED_ROW_COLUMNS: RecordRowColumnSpec[] = [
  { key: "categoryFilter", minWidth: 132, label: "Filter" },
  { key: "product", minWidth: 220, grow: 1.3, label: "Product" },
  { key: "itemNumber", minWidth: 116, label: "Item #" },
  { key: "stock", minWidth: 156, align: "center", label: "Starting Stock" },
  { key: "location", minWidth: 196, label: "Location" },
  { key: "dyeLot", minWidth: 124, label: "Dye Lot" },
  { key: "cost", minWidth: 116, align: "end", label: "Cost" },
  { key: "freight", minWidth: 116, align: "end", label: "Freight" },
  { key: "notes", minWidth: 240, grow: 1.2, label: "Notes" },
  { key: "status", minWidth: 132, align: "center", label: "Status" },
  { key: "remove", minWidth: 100, align: "center", label: "Remove" },
]

function statusBadgeTone(status: FlooringStagedRowStatus | null) {
  switch (status) {
    case "QUEUED":
      return "processing" as const
    case "IMPORTED":
      return "success" as const
    default:
      return "neutral" as const
  }
}

function statusBadgeLabel(status: FlooringStagedRowStatus | null) {
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
  subHeader,
  drafts,
  serverRows,
  warehouseId,
  productOptions,
  warehouseOptions: _warehouseOptions,
  locationOptions,
  categoryOptions,
  noticeMessage,
  noticeError,
  onRowFieldChange,
  onRowCategoryFilterChange,
  onRemoveRow,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  drafts: ImportStagedRowDraft[]
  serverRows: StagedInventoryRow[]
  warehouseId: string
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  categoryOptions: CategoryOption[]
  noticeMessage?: string
  noticeError?: string
  onRowFieldChange: (
    index: number,
    field: Exclude<keyof Omit<ImportStagedRowDraft, "clientId">, "categoryFilterId">,
    value: string,
  ) => void
  onRowCategoryFilterChange: (index: number, categoryId: string | null) => void
  onRemoveRow: (index: number) => void
}) {
  const serverStatusById = new Map(serverRows.map((row) => [row.id, row.status]))

  return (
    <RecordItemSection
      title="Staged Inventory Rows"
      bodyClassName="space-y-0"
      subHeader={subHeader}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={[{ label: "Rows", value: String(drafts.length) }]}
      capabilities={{
        editable: true,
        supportsAddRow: true,
        supportsSaveDiscard: true,
        supportsRemoveRow: true,
        supportsStatusColumn: true,
        supportsMetrics: true,
        supportsSummary: false,
        supportsEmptyState: true,
      }}
      isEmpty={drafts.length === 0}
      emptyState="No staged inventory rows have been added yet."
    >
      <RecordSectionGrid
        columns={IMPORT_STAGED_ROW_COLUMNS}
        isEmpty={drafts.length === 0}
        emptyState="No staged inventory rows have been added yet."
      >
        {drafts.map((row, index) => {
          const filteredLocations = warehouseId
            ? locationOptions.filter((location) => location.warehouseId === warehouseId)
            : locationOptions
          const selectedProduct = productOptions.find((product) => product.id === row.productId)
          // Row-wide editability gate: queued or imported rows are read-only —
          // they're already in the worker's hands. Locally-added drafts
          // (no server status yet) are always editable.
          const serverStatus = serverStatusById.get(row.clientId) ?? null
          const locked = serverStatus !== null && serverStatus !== "DRAFT"
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
              columns={IMPORT_STAGED_ROW_COLUMNS}
              rowTone="default"
            >
              <RecordRowLayout columns={IMPORT_STAGED_ROW_COLUMNS}>
                <RecordItemCell columnKey="categoryFilter" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellDropdown
                    ariaLabel={`Staged inventory row ${index + 1} category filter`}
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
                    aria-label={`Staged inventory row ${index + 1} product`}
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
                    aria-label={`Staged inventory row ${index + 1} item number`}
                    value={row.itemNumber}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "itemNumber", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="stock" chrome="grid" showLabel={index === 0}>
                  <div className="flex items-center justify-center gap-2">
                    <RecordGridCellInput
                      aria-label={`Staged inventory row ${index + 1} starting stock`}
                      value={row.startingStock}
                      inputMode="decimal"
                      placeholder="0.00"
                      align="center"
                      controlSize="compact"
                      disabled={locked}
                      onChange={(event) => onRowFieldChange(index, "startingStock", event.target.value)}
                    />
                    <span className="text-xs text-[var(--foreground)]/60">{selectedProduct?.stockUnit || "unit"}</span>
                  </div>
                </RecordItemCell>
                <RecordItemCell columnKey="location" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellSelect
                    aria-label={`Staged inventory row ${index + 1} location`}
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
                    aria-label={`Staged inventory row ${index + 1} dye lot`}
                    value={row.dyeLot}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "dyeLot", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="cost" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    aria-label={`Staged inventory row ${index + 1} cost`}
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
                    aria-label={`Staged inventory row ${index + 1} freight`}
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
                    aria-label={`Staged inventory row ${index + 1} notes`}
                    value={row.notes}
                    disabled={locked}
                    onChange={(event) => onRowFieldChange(index, "notes", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="status" chrome="grid" showLabel={index === 0}>
                  <div className="flex min-h-[2.5rem] items-center justify-center">
                    <RecordRowStatusBadge tone={statusBadgeTone(serverStatus)}>
                      {statusBadgeLabel(serverStatus)}
                    </RecordRowStatusBadge>
                  </div>
                </RecordItemCell>
                <RecordItemSectionControls
                  capabilities={{ supportsStatusColumn: true, supportsRemoveRow: true }}
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
