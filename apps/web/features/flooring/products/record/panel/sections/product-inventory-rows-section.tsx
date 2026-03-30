"use client"

import type { ReactNode } from "react"
import { formatStableDateTime } from "@/features/flooring/shared/utils/date-format"
import { calculateProductInventorySummary } from "../../../domain/inventory-summary"
import { formatInventoryImportNumber, formatInventoryQuantity } from "@/features/flooring/inventory/domain/formatters"
import {
  RecordAllocationItemRow,
  RecordAllocationItemsPanel,
  RecordItemCell,
  RecordRowLayout,
  RecordRowOpenButton,
  RecordRowToggleButton,
  RecordSectionItem,
  RecordSectionShell,
  TextCell,
  type RecordRowColumnSpec,
} from "@/features/shared/engines/record-view"
import type { ProductInventoryRow } from "../../../domain/types"

const INVENTORY_ROW_COLUMNS: RecordRowColumnSpec[] = [
  { key: "itemNumber", minWidth: 140, grow: 1 },
  { key: "location", minWidth: 280, grow: 2 },
  { key: "stock", minWidth: 140, grow: 1, align: "center" },
  { key: "cost", minWidth: 132, grow: 1, align: "end" },
  { key: "freight", minWidth: 132, grow: 1, align: "end" },
  { key: "cutTotal", minWidth: 148, grow: 1, align: "center" },
  { key: "runningBalance", minWidth: 168, grow: 1, align: "center" },
  { key: "toggle", minWidth: 120, grow: 0, align: "center" },
  { key: "open", minWidth: 108, grow: 0, align: "center" },
]

const CUT_LOG_COLUMNS: RecordRowColumnSpec[] = [
  { key: "createdAt", minWidth: 176 },
  { key: "cut", minWidth: 144, align: "center" },
  { key: "before", minWidth: 144, align: "center" },
  { key: "after", minWidth: 144, align: "center" },
  { key: "notes", minWidth: 320, grow: 2 },
]

function readLocationLabel(row: ProductInventoryRow) {
  const parts = [row.warehouseName, row.sectionName, row.locationCode].filter(Boolean)
  return parts.length > 0 ? parts.join(" / ") : "No location"
}

function ProductCutLogRow({
  row,
}: {
  row: ProductInventoryRow["cutLogs"][number]
}) {
  return (
    <RecordAllocationItemRow>
      <RecordRowLayout columns={CUT_LOG_COLUMNS}>
        <RecordItemCell label="Created" columnKey="createdAt" tone="allocation" density="compact">
          <TextCell>{formatStableDateTime(row.createdAt)}</TextCell>
        </RecordItemCell>
        <RecordItemCell label="Cut" columnKey="cut" tone="allocation" density="compact">
          <TextCell align="center">{row.cut}</TextCell>
        </RecordItemCell>
        <RecordItemCell label="Before" columnKey="before" tone="allocation" density="compact">
          <TextCell align="center">{row.before}</TextCell>
        </RecordItemCell>
        <RecordItemCell label="After" columnKey="after" tone="allocation" density="compact">
          <TextCell align="center">{row.after}</TextCell>
        </RecordItemCell>
        <RecordItemCell label="Notes" columnKey="notes" tone="allocation" density="compact">
          <TextCell noWrap={false}>{row.notes || "-"}</TextCell>
        </RecordItemCell>
      </RecordRowLayout>
    </RecordAllocationItemRow>
  )
}

export function ProductInventoryRowsSection({
  actionPanel,
  inventoryRows,
  expandedInventoryIds,
  loadingInventoryId,
  onToggleInventoryCutLogs,
  onOpenInventory,
}: {
  actionPanel?: ReactNode
  inventoryRows: ProductInventoryRow[]
  expandedInventoryIds: string[]
  loadingInventoryId: string | null
  onToggleInventoryCutLogs: (inventoryId: string) => void
  onOpenInventory: (inventoryId: string) => void
}) {
  const summary = calculateProductInventorySummary(inventoryRows)

  return (
    <RecordSectionShell
      title="Inventory Rows"
      bodyClassName="space-y-4"
      statusPanel={actionPanel}
      metrics={[
        { label: "Rows", value: String(summary.rowCount) },
        { label: "Total Cost", value: summary.totalCostLabel },
      ]}
    >
      {inventoryRows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No inventory rows found for this product.
        </div>
      ) : null}

      {inventoryRows.map((row) => {
        const isExpanded = expandedInventoryIds.includes(row.id)

        return (
          <RecordSectionItem
            key={row.id}
            nestedContent={
              isExpanded ? (
                <RecordAllocationItemsPanel emptyState="No cut logs recorded for this inventory row.">
                  {row.cutLogs.map((cutLog) => (
                    <ProductCutLogRow key={cutLog.id} row={cutLog} />
                  ))}
                </RecordAllocationItemsPanel>
              ) : null
            }
          >
            <RecordRowLayout columns={INVENTORY_ROW_COLUMNS}>
              <RecordItemCell label="Item #" columnKey="itemNumber">
                <TextCell className="font-medium">{row.itemNumber}</TextCell>
              </RecordItemCell>
              <RecordItemCell label="Location" columnKey="location">
                <div className="space-y-1 text-left">
                  <TextCell noWrap={false}>{readLocationLabel(row)}</TextCell>
                  <div className="text-xs text-[var(--foreground)]/55">
                    {row.importNumber ? formatInventoryImportNumber(row.importNumber) : "No import"}
                  </div>
                </div>
              </RecordItemCell>
              <RecordItemCell label="Stock" columnKey="stock">
                <TextCell align="center">{formatInventoryQuantity(row.stockCount, row.stockUnit)}</TextCell>
              </RecordItemCell>
              <RecordItemCell label="Cost" columnKey="cost">
                <TextCell align="right">{row.cost ? `$${row.cost}` : "-"}</TextCell>
              </RecordItemCell>
              <RecordItemCell label="Freight" columnKey="freight">
                <TextCell align="right">{row.freight ? `$${row.freight}` : "-"}</TextCell>
              </RecordItemCell>
              <RecordItemCell label="Cut Total" columnKey="cutTotal">
                <TextCell align="center">{formatInventoryQuantity(row.cutTotal, row.stockUnit)}</TextCell>
              </RecordItemCell>
              <RecordItemCell label="Running Balance" columnKey="runningBalance">
                <TextCell align="center">{formatInventoryQuantity(row.runningBalance, row.stockUnit)}</TextCell>
              </RecordItemCell>
              <RecordItemCell label="Show / Hide" columnKey="toggle">
                <div className="flex min-h-[2.5rem] items-center justify-center">
                  <RecordRowToggleButton
                    expanded={isExpanded}
                    onToggle={() => onToggleInventoryCutLogs(row.id)}
                    ariaLabel={isExpanded ? `Hide cut logs for inventory ${row.itemNumber}` : `Show cut logs for inventory ${row.itemNumber}`}
                  />
                </div>
              </RecordItemCell>
              <RecordItemCell label="Open" columnKey="open">
                <div className="flex min-h-[2.5rem] items-center justify-center">
                  <RecordRowOpenButton
                    onOpen={() => onOpenInventory(row.id)}
                    loading={loadingInventoryId === row.id}
                  />
                </div>
              </RecordItemCell>
            </RecordRowLayout>
          </RecordSectionItem>
        )
      })}
    </RecordSectionShell>
  )
}
