import { RecordSummaryCard } from "@/features/flooring/shared/ui/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/ui/display/record-summary-grid"

export function InventorySnapshotGrid({
  summary,
}: {
  summary: {
    importNumber: string
    importTag: string
    productName: string
    itemNumber: string
    warehouseName: string
    sectionName: string
    locationCode: string
    dyeLot: string
    startingStockLabel: string
    cutTotalLabel: string
    runningBalanceLabel: string
    notes: string
  }
}) {
  return (
    <RecordSummaryGrid>
      <RecordSummaryCard label="Import #">{summary.importNumber ? `IMP-${summary.importNumber.padStart(4, "0")}` : "-"}</RecordSummaryCard>
      <RecordSummaryCard label="Import Tag">{summary.importTag || "-"}</RecordSummaryCard>
      <RecordSummaryCard label="Product">{summary.productName}</RecordSummaryCard>
      <RecordSummaryCard label="Item #">{summary.itemNumber}</RecordSummaryCard>
      <RecordSummaryCard label="Warehouse">{summary.warehouseName || "-"}</RecordSummaryCard>
      <RecordSummaryCard label="Section">{summary.sectionName || "-"}</RecordSummaryCard>
      <RecordSummaryCard label="Location">{summary.locationCode || "-"}</RecordSummaryCard>
      <RecordSummaryCard label="Dye Lot">{summary.dyeLot || "-"}</RecordSummaryCard>
      <RecordSummaryCard label="Starting Stock">{summary.startingStockLabel}</RecordSummaryCard>
      <RecordSummaryCard label="Cuts Total">{summary.cutTotalLabel}</RecordSummaryCard>
      <RecordSummaryCard label="Running Balance">
        <span className="text-blue-500">{summary.runningBalanceLabel}</span>
      </RecordSummaryCard>
      <RecordSummaryCard label="Notes">{summary.notes || "-"}</RecordSummaryCard>
    </RecordSummaryGrid>
  )
}
