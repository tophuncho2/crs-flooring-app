"use client"

import { Fragment } from "react"
import { formatStableDateTime } from "@builders/domain"
import { calculateProductInventorySummary } from "../../../domain/inventory-summary"
import { formatInventoryImportNumber, formatInventoryQuantity } from "@/modules/inventory/domain/formatters"
import {
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordScopedRow,
  RecordSectionGrid,
  RecordSectionGridRow,
  TextCell,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
  type RecordGridLayout,
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
  { key: "toggle", minWidth: 120, grow: 0, align: "center", label: "Show / Hide" },
  { key: "open", minWidth: 108, grow: 0, align: "center", label: "Open" },
]

const CUT_LOG_COLUMNS: RecordRowColumnSpec[] = [
  { key: "createdAt", minWidth: 176, label: "Created" },
  { key: "cut", minWidth: 144, align: "center", label: "Cut" },
  { key: "before", minWidth: 144, align: "center", label: "Before" },
  { key: "after", minWidth: 144, align: "center", label: "After" },
  { key: "notes", minWidth: 320, grow: 2, label: "Notes" },
]

const CUT_LOG_LAYOUT: RecordGridLayout = { dataColumns: CUT_LOG_COLUMNS }

function readLocationLabel(row: ProductInventoryRow) {
  const parts = [row.warehouseName, row.sectionName, row.locationCode].filter(Boolean)
  return parts.length > 0 ? parts.join(" / ") : "No location"
}

export function ProductInventoryRowsSection({
  subHeader,
  inventoryRows,
  expandedInventoryIds,
  loadingInventoryId,
  onToggleInventoryCutLogs,
  onOpenInventory,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  inventoryRows: ProductInventoryRow[]
  expandedInventoryIds: string[]
  loadingInventoryId: string | null
  onToggleInventoryCutLogs: (inventoryId: string) => void
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
        supportsScopedRows: true,
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
        {inventoryRows.map((row, index) => {
          const isExpanded = expandedInventoryIds.includes(row.id)

          return (
            <Fragment key={row.id}>
              <RecordSectionGridRow
                columns={INVENTORY_ROW_COLUMNS}
              >
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
                  capabilities={{ supportsScopedRows: true, supportsOpenRow: true }}
                  cellChrome="grid"
                  showCellLabels={index === 0}
                  toggle={{
                    expanded: isExpanded,
                    onToggle: () => onToggleInventoryCutLogs(row.id),
                    ariaLabel: isExpanded ? `Hide cut logs for inventory ${row.itemNumber}` : `Show cut logs for inventory ${row.itemNumber}`,
                  }}
                  open={{
                    onOpen: () => onOpenInventory(row.id),
                    loading: loadingInventoryId === row.id,
                  }}
                />
              </RecordSectionGridRow>
              {isExpanded ? (
                row.cutLogs.length === 0 ? (
                  <div className="bg-orange-500/[0.06] px-4 py-8 text-center text-[var(--foreground)]/65">
                    No cut logs recorded for this inventory row.
                  </div>
                ) : (
                  row.cutLogs.map((cutLog, cutLogIndex) => (
                    <RecordScopedRow
                      key={cutLog.id}
                      layout={CUT_LOG_LAYOUT}
                      rowTone="allocation"
                    >
                      <RecordItemCell columnKey="createdAt" chrome="grid" tone="allocation" density="compact" showLabel={cutLogIndex === 0}>
                        <TextCell>{formatStableDateTime(cutLog.createdAt)}</TextCell>
                      </RecordItemCell>
                      <RecordItemCell columnKey="cut" chrome="grid" tone="allocation" density="compact" showLabel={cutLogIndex === 0}>
                        <TextCell align="center">{cutLog.cut}</TextCell>
                      </RecordItemCell>
                      <RecordItemCell columnKey="before" chrome="grid" tone="allocation" density="compact" showLabel={cutLogIndex === 0}>
                        <TextCell align="center">{cutLog.before}</TextCell>
                      </RecordItemCell>
                      <RecordItemCell columnKey="after" chrome="grid" tone="allocation" density="compact" showLabel={cutLogIndex === 0}>
                        <TextCell align="center">{cutLog.after}</TextCell>
                      </RecordItemCell>
                      <RecordItemCell columnKey="notes" chrome="grid" tone="allocation" density="compact" showLabel={cutLogIndex === 0}>
                        <TextCell noWrap={false}>{cutLog.notes || "-"}</TextCell>
                      </RecordItemCell>
                    </RecordScopedRow>
                  ))
                )
              ) : null}
            </Fragment>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
