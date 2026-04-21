"use client"

import {
  calculateInventoryCostSummary,
  formatInventoryImportNumber,
  formatInventoryQuantity,
  type InventoryRow,
} from "@builders/domain"
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

const INVENTORY_ROW_COLUMNS: RecordRowColumnSpec[] = [
  { key: "itemNumber", minWidth: 140, grow: 1, label: "Item #" },
  { key: "location", minWidth: 280, grow: 2, label: "Location" },
  { key: "importNumber", minWidth: 168, grow: 1, label: "Import" },
  { key: "stock", minWidth: 140, grow: 1, align: "center", label: "Stock" },
  { key: "cost", minWidth: 132, grow: 1, align: "end", label: "Cost" },
  { key: "freight", minWidth: 132, grow: 1, align: "end", label: "Freight" },
  { key: "totalCutBalance", minWidth: 148, grow: 1, align: "center", label: "Cut Balance" },
  { key: "uncutBalance", minWidth: 168, grow: 1, align: "center", label: "Uncut Balance" },
  { key: "open", minWidth: 108, grow: 0, align: "center", label: "Open" },
]

function readLocationLabel(row: InventoryRow) {
  const parts = [row.warehouseName, row.sectionNumber, row.locationCode].filter(Boolean)
  return parts.length > 0 ? parts.join(" / ") : "No location"
}

export function ProductInventoryRowsSection({
  subHeader,
  inventoryRows,
  loadingInventoryId,
  onOpenInventory,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  inventoryRows: InventoryRow[]
  loadingInventoryId: string | null
  onOpenInventory: (inventoryId: string) => void
}) {
  const summary = calculateInventoryCostSummary(inventoryRows)

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
            <RecordItemCell columnKey="totalCutBalance" chrome="grid" showLabel={index === 0}>
              <TextCell align="center">{formatInventoryQuantity(row.totalCutBalance, row.stockUnit)}</TextCell>
            </RecordItemCell>
            <RecordItemCell columnKey="uncutBalance" chrome="grid" showLabel={index === 0}>
              <TextCell align="center">{formatInventoryQuantity(row.uncutBalance, row.stockUnit)}</TextCell>
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
