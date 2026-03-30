"use client"

import type { ReactNode } from "react"
import {
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemSection,
  RecordItemSectionControls,
  RecordItemCell,
  RecordRowLayout,
  RecordSectionItem,
  RecordSectionStatusBadge,
  type RecordSectionSubHeaderProps,
} from "@/features/shared/engines/record-view"
import { calculateImportSummary } from "../../../domain/summary"
import type { ImportInventoryRowDraft, LocationOption, ProductOption, WarehouseOption } from "../../../domain/types"

const IMPORT_INVENTORY_ROW_COLUMNS = [
  { key: "product", minWidth: 240, grow: 1.3 },
  { key: "itemNumber", minWidth: 132 },
  { key: "stock", minWidth: 132, align: "center" as const },
  { key: "location", minWidth: 220 },
  { key: "dyeLot", minWidth: 144 },
  { key: "cost", minWidth: 132, align: "end" as const },
  { key: "freight", minWidth: 132, align: "end" as const },
  { key: "notes", minWidth: 280, grow: 1.2 },
  { key: "remove", minWidth: 110, align: "center" as const },
]

function isDraftRow(row: ImportInventoryRowDraft) {
  return row.clientId.startsWith("local:")
}

export function ImportInventoryRowsSection({
  subHeader,
  rows,
  warehouseId,
  productOptions,
  warehouseOptions,
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
  const activeWarehouseName = warehouseOptions.find((warehouse) => warehouse.id === warehouseId)?.name || "-"

  return (
    <RecordItemSection
      title="Import Inventory Rows"
      bodyClassName="space-y-4"
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
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: true,
      }}
      isEmpty={rows.length === 0}
      emptyState={(
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No import inventory rows have been added yet.
        </div>
      )}
    >

      {rows.map((row, index) => {
        const filteredLocations = warehouseId
          ? locationOptions.filter((location) => location.warehouseId === warehouseId)
          : locationOptions
        const selectedProduct = productOptions.find((product) => product.id === row.productId)

        return (
          <RecordSectionItem
            key={row.clientId}
            status={isDraftRow(row) ? <RecordSectionStatusBadge tone="warning">Draft</RecordSectionStatusBadge> : undefined}
          >
            <RecordRowLayout columns={IMPORT_INVENTORY_ROW_COLUMNS}>
              <RecordItemCell label="Product" columnKey="product">
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
              <RecordItemCell label="Item #" columnKey="itemNumber">
                <RecordGridCellInput
                  aria-label={`Import inventory row ${index + 1} item number`}
                  value={row.itemNumber}
                  onChange={(event) => onRowFieldChange(index, "itemNumber", event.target.value)}
                />
              </RecordItemCell>
              <RecordItemCell label="Stock" columnKey="stock" align="center">
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
              <RecordItemCell label="Location" columnKey="location">
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
              <RecordItemCell label="Dye Lot" columnKey="dyeLot">
                <RecordGridCellInput
                  aria-label={`Import inventory row ${index + 1} dye lot`}
                  value={row.dyeLot}
                  onChange={(event) => onRowFieldChange(index, "dyeLot", event.target.value)}
                />
              </RecordItemCell>
              <RecordItemCell label="Cost" columnKey="cost" align="end">
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
              <RecordItemCell label="Freight" columnKey="freight" align="end">
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
              <RecordItemCell label="Notes" columnKey="notes">
                <div className="space-y-2">
                  <RecordGridCellInput
                    aria-label={`Import inventory row ${index + 1} notes`}
                    value={row.notes}
                    onChange={(event) => onRowFieldChange(index, "notes", event.target.value)}
                  />
                  <div className="text-xs text-[var(--foreground)]/55">
                    Warehouse: {activeWarehouseName}
                  </div>
                </div>
              </RecordItemCell>
              <RecordItemSectionControls
                capabilities={{ supportsRemoveRow: true }}
                remove={{
                  onRemove: () => onRemoveRow(index),
                }}
              />
            </RecordRowLayout>
          </RecordSectionItem>
        )
      })}
    </RecordItemSection>
  )
}
