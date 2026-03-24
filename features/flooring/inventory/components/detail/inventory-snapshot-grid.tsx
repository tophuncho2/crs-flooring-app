import { RecordSummaryCard } from "@/features/flooring/shared/ui/display/record-summary-card"
import { RecordSummaryGrid } from "@/features/flooring/shared/ui/display/record-summary-grid"

export function InventorySnapshotGrid({
  summary,
}: {
  summary: {
    runningBalanceLabel: string
    cutTotalLabel: string
    startingStockLabel: string
    sectionName: string
  }
}) {
  return (
    <RecordSummaryGrid>
      <RecordSummaryCard label="Running Balance">
        <span className="text-blue-500">{summary.runningBalanceLabel}</span>
      </RecordSummaryCard>
      <RecordSummaryCard label="Cuts Total">{summary.cutTotalLabel}</RecordSummaryCard>
      <RecordSummaryCard label="Starting Stock">{summary.startingStockLabel}</RecordSummaryCard>
      <RecordSummaryCard label="Section">{summary.sectionName || "-"}</RecordSummaryCard>
    </RecordSummaryGrid>
  )
}
