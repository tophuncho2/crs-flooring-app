import { CellChip } from "@/engines/common"
import type { IndicatorStockStatus } from "@builders/domain"

// Semantic stock status → chip tone. `low` = amber warning (the primary signal),
// `ok` = green success, `none` = neutral (no threshold set). The tone path pulls
// its Tailwind classes from the ONE palette anchor (toneChipClassName).
const STATUS_TONE: Record<IndicatorStockStatus, "success" | "warning" | "muted"> = {
  ok: "success",
  low: "warning",
  none: "muted",
}

/** The colored stock-level status chip, shared by the standalone list + the product section. */
export function IndicatorStatusChip({
  status,
  label,
}: {
  status: IndicatorStockStatus
  label: string
}) {
  return <CellChip tone={STATUS_TONE[status]}>{label}</CellChip>
}
