"use client"

import { calculateProductInventorySummary } from "../../../domain/inventory-summary"
import { formatInventoryImportNumber, formatInventoryQuantity } from "@/modules/inventory/domain/formatters"
import {
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordSectionGrid,
  RecordSectionGridRow,
  TextCell,
  type RecordRowColumnSpec,
  type RecordSectionSubHeaderProps,
} from "@/modules/shared/engines/record-view"
import type { ProductInventoryRow } from "../../../domain/types"

const INVENTORY_ROW_COLUMNS: RecordRowColumnSpec[] = [
  { key: "itemNumber", minWidth: 140, grow: 1, label: "Item #" },
  { key: "location", minWidth: 280, grow: 2, label: "Location" },
  { key: "importNumber", minWidth: 168, grow: 1, label: "Import" },
  { key: "stock", minWidth: 140, grow: 1, align: "center", label: "Stock" },
  { key: "cost", minWidth: 132, grow: 1, align: "end", label: "Cost" },
  { key: "freight", minWidth: 132, grow: 1, align: "end", label: "Freight" },
  { key: "cutTotal", minWidth: 148, grow: 1, align: "center", label: "Cut Total" },
  { key: "runningBalance", minWidth: 168, grow: 1, align: "center", label: "Running Balance" },
  { key: "open", minWidth: 108, grow: 0, align: "center", label: "Open" },
]

function readLocationLabel(row: ProductInventoryRow) {
  const parts = [row.warehouseName, row.sectionName, row.locationCode].filter(Boolean)
  return parts.length > 0 ? parts.join(" / ") : "No location"
}

export function ProductInventoryRowsSection({
  subHeader,
  inventoryRows,
  loadingInventoryId,
  onOpenInventory,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  inventoryRows: ProductInventoryRow[]
  loadingInventoryId: string | null
  onOpenInventory: (inventoryId: string) => void
}) {
  const summary = calculateProductInventorySummary(inventoryRows)

  return (
    <RecordItemSection
      title="Inventory Rows"
      bodyClassName="space-y-0"
      subHeader={subHeader}
      metrics={[
        { label: "Rows", value: String(summary.rowCount) },
        { label: "Total Cost", value: summary.totalCostLabel },
      ]}
      capabilities={{
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: true,
        supportsOpenRow: true,
      }}
      isEmpty={inventoryRows.length === 0}
      emptyState="No inventory rows found for this product."
    >
      <RecordSectionGrid
        columns={INVENTORY_ROW_COLUMNS}
        isEmpty={inventoryRows.length === 0}
        emptyState="No inventory rows found for this product."
      >
        {inventoryRows.map((row, index) => (
          <RecordSectionGridRow key={row.id} columns={INVENTORY_ROW_COLUMNS}>
            <RecordItemCell columnKey="itemNumber" chrome="grid" showLabel={index === 0}>
              <TextCell className="font-medium">{row.itemNumber}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="location" chrome="grid" showLabel={index === 0}>
              <TextCell noWrap={false}>{readLocationLabel(row)}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="importNumber" chrome="grid" showLabel={index === 0}>
              <TextCell>{row.importNumber ? formatInventoryImportNumber(row.importNumber) : "No import"}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="stock" chrome="grid" showLabel={index === 0}>
              <TextCell align="center">{formatInventoryQuantity(row.stockCount, row.stockUnit)}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="cost" chrome="grid" showLabel={index === 0}>
              <TextCell align="right">{row.cost ? `$${row.cost}` : "-"}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="freight" chrome="grid" showLabel={index === 0}>
              <TextCell align="right">{row.freight ? `$${row.freight}` : "-"}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="cutTotal" chrome="grid" showLabel={index === 0}>
              <TextCell align="center">{formatInventoryQuantity(row.cutTotal, row.stockUnit)}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="runningBalance" chrome="grid" showLabel={index === 0}>
              <TextCell align="center">{formatInventoryQuantity(row.runningBalance, row.stockUnit)}</TextCell>
            </RecordItemCell>
            <RecordItemSectionControls
              capabilities={{ supportsOpenRow: true }}
              cellChrome="grid"
              showCellLabels={index === 0}
              open={{
                onOpen: () => onOpenInventory(row.id),
                loading: loadingInventoryId === row.id,
              }}
            />
          </RecordSectionGridRow>
        ))}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
