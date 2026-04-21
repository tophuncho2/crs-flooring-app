"use client"

import {
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordRowLayout,
  RecordRowStatusBadge,
  RecordSectionGrid,
  RecordSectionGridRow,
  resolveRecordRowStatus,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
} from "@/modules/shared/engines/record-view"
import { calculateImportSummary } from "@builders/domain"
import type { ImportInventoryRowDraft, LocationOption, ProductOption, WarehouseOption } from "../../drafts"

const IMPORT_INVENTORY_ROW_COLUMNS: RecordRowColumnSpec[] = [
  { key: "product", minWidth: 240, grow: 1.3, label: "Product" },
  { key: "itemNumber", minWidth: 132, label: "Item #" },
  { key: "stock", minWidth: 164, align: "center", label: "Stock" },
  { key: "location", minWidth: 220, label: "Location" },
  { key: "dyeLot", minWidth: 144, label: "Dye Lot" },
  { key: "cost", minWidth: 132, align: "end", label: "Cost" },
  { key: "freight", minWidth: 132, align: "end", label: "Freight" },
  { key: "notes", minWidth: 280, grow: 1.2, label: "Notes" },
  { key: "status", minWidth: 120, align: "center", label: "Status" },
  { key: "remove", minWidth: 110, align: "center", label: "Remove" },
]

function isDraftRow(row: ImportInventoryRowDraft) {
  return row.clientId.startsWith("local:")
}

export function ImportInventoryRowsSection({
  subHeader,
  rows,
  warehouseId,
  productOptions,
  warehouseOptions: _warehouseOptions,
  locationOptions,
  noticeMessage,
  noticeError,
  onRowFieldChange,
  onRemoveRow,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  rows: ImportInventoryRowDraft[]
  warehouseId: string
  productOptions: ProductOption[]
  warehouseOptions: WarehouseOption[]
  locationOptions: LocationOption[]
  noticeMessage?: string
  noticeError?: string
  onRowFieldChange: (index: number, field: keyof Omit<ImportInventoryRowDraft, "clientId">, value: string) => void
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
        supportsStatusColumn: true,
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
          const status = resolveRecordRowStatus({ isUnsaved: isDraftRow(row) })

          return (
            <RecordSectionGridRow
              key={row.clientId}
              columns={IMPORT_INVENTORY_ROW_COLUMNS}
              rowTone={status.key === "unsaved" ? "allocation" : "default"}
            >
              <RecordRowLayout columns={IMPORT_INVENTORY_ROW_COLUMNS}>
                <RecordItemCell columnKey="product" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellSelect
                    aria-label={`Import inventory row ${index + 1} product`}
                    value={row.productId}
                    onChange={(event) => onRowFieldChange(index, "productId", event.target.value)}
                  >
                    <option value="">Select product</option>
                    {productOptions.map((product) => (
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
                      onChange={(event) => onRowFieldChange(index, "stockCount", event.target.value)}
                    />
                    <span className="text-xs text-[var(--foreground)]/60">{selectedProduct?.stockUnit || "unit"}</span>
                  </div>
                </RecordItemCell>
                <RecordItemCell columnKey="location" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellSelect
                    aria-label={`Import inventory row ${index + 1} location`}
                    value={row.locationId}
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
                    onChange={(event) => onRowFieldChange(index, "freight", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemCell columnKey="notes" chrome="grid" showLabel={index === 0}>
                  <RecordGridCellInput
                    aria-label={`Import inventory row ${index + 1} notes`}
                    value={row.notes}
                    onChange={(event) => onRowFieldChange(index, "notes", event.target.value)}
                  />
                </RecordItemCell>
                <RecordItemSectionControls
                  capabilities={{ supportsStatusColumn: true, supportsRemoveRow: true }}
                  cellChrome="grid"
                  showCellLabels={index === 0}
                  status={{
                    content: (
                      <RecordRowStatusBadge tone={status.tone}>
                        {status.label}
                      </RecordRowStatusBadge>
                    ),
                  }}
                  remove={{
                    onRemove: () => onRemoveRow(index),
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
