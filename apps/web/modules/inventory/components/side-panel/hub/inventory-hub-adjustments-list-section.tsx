"use client"

import type { ReactNode } from "react"
import { AdjustmentStatusBadge } from "@/components/badges/adjustment-status-badge"
import {
  HubSidePanelScopedRow,
  HubSidePanelScrollList,
} from "@/components/hub-side-panel"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

const EMPTY_CELL = "—"

const LABEL_CLASS = "text-[var(--foreground)]/45"
const VALUE_CLASS = "text-[var(--foreground)]/80 tabular-nums"

function formatCutWithUnit(value: string, unit: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) return EMPTY_CELL
  const unitTrim = unit.trim()
  return unitTrim.length > 0 ? `${trimmed} ${unitTrim}` : trimmed
}

/**
 * Title line: `#{finalCutSequence} · {cut} {stockUnit} · {coverageCut}
 * {coverageUnit}`. The sequence leads so the row's finalize rank survives
 * truncation (the list sorts by finalCutSequence DESC); pending rows have no
 * sequence and no-coverage categories drop the coverage segment. Adjustment #
 * is intentionally omitted from the display (kept on the aria-label only).
 */
function buildAdjustmentTitle(row: {
  adjustmentType: "INCREASE" | "DEDUCTION"
  quantity: string
  coverage: string | null
  finalSequence: number | null
  stockUnitAbbrev: string | null
  itemCoverageUnitAbbrev: string | null
}): string {
  const segments: string[] = []
  if (row.finalSequence !== null) segments.push(`#${row.finalSequence}`)

  const quantity = formatCutWithUnit(row.quantity, row.stockUnitAbbrev ?? "")
  // Lead the amount with its direction so INCREASE rows read distinctly from
  // deduction cuts (the list mixes both now).
  if (quantity !== EMPTY_CELL) {
    const sign = row.adjustmentType === "INCREASE" ? "+" : "−"
    segments.push(`${sign}${quantity}`)
  }

  if (row.coverage !== null && row.coverage.trim().length > 0) {
    segments.push(formatCutWithUnit(row.coverage, row.itemCoverageUnitAbbrev ?? ""))
  }

  return segments.join(" · ")
}

/**
 * Subtitle lines: a labelled `Before … → After …` line (only once the cut is
 * finalized and the running balance is stamped) followed by a `Note: …` line.
 * Each is omitted when its data is absent — a fresh pending cut shows just its
 * note, or nothing.
 */
function buildAdjustmentSubtitleLines(row: {
  before: string | null
  after: string | null
  notes: string
  stockUnitAbbrev: string | null
}): ReactNode[] {
  const lines: ReactNode[] = []

  if (row.before !== null && row.after !== null) {
    const unit = (row.stockUnitAbbrev ?? "").trim()
    lines.push(
      <span>
        <span className={VALUE_CLASS}>{formatCutWithUnit(row.before, unit)}</span>
        <span className={LABEL_CLASS}> → </span>
        <span className={VALUE_CLASS}>{formatCutWithUnit(row.after, unit)}</span>
      </span>,
    )
  }

  if (row.notes.trim().length > 0) {
    lines.push(
      <span>
        <span className={LABEL_CLASS}>Note: </span>
        {row.notes}
      </span>,
    )
  }

  return lines
}

/**
 * Infinite-scroll adjustments list inside the inventory hub. Mirrors the property
 * hub's properties-list section: each row is clickable; click transitions the
 * panel into `section-edit-adjustment` mode for that row.
 *
 * Row anatomy: the title packs cut / coverage cut / final-cut sequence (each
 * with its own snapshot unit) with the status badge trailing in the meta slot;
 * the subtitle stacks a labelled before/after line and the note. Units come
 * from the row's own snapshot (each cut froze its UoM at creation), not the
 * parent inventory's current unit.
 *
 * Reuses the same query key the inline `InventoryAdjustmentsSection` does, so
 * mutations refresh both surfaces with one cache invalidation.
 */
export function InventoryHubAdjustmentsListSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { adjustments, enterAdjustmentEditFromContext } = controller
  const { rows, hasData, isEmpty, isError, hasMore, isFetchingMore, loadMore } = adjustments

  return (
    <HubSidePanelScrollList
      title="Adjustments"
      hasData={hasData}
      isEmpty={isEmpty}
      isError={isError}
      errorMessage="Could not load adjustments."
      loadingMessage="Loading adjustments…"
      emptyMessage="No adjustments on this inventory."
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
      onLoadMore={loadMore}
    >
      {rows.map((row) => (
        <HubSidePanelScopedRow
          key={row.id}
          primary={buildAdjustmentTitle(row)}
          secondaryLines={buildAdjustmentSubtitleLines(row)}
          meta={<AdjustmentStatusBadge status={row.status} />}
          onClick={() => enterAdjustmentEditFromContext(row)}
          ariaLabel={`Edit adjustment ${row.adjustmentNumber}`}
        />
      ))}
    </HubSidePanelScrollList>
  )
}
