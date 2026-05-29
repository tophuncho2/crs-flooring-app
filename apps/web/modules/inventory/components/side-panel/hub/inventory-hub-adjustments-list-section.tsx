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

function formatCutWithUnit(value: string, unit: string): string {
  const trimmed = value.trim()
  if (trimmed.length === 0) return EMPTY_CELL
  const unitTrim = unit.trim()
  return unitTrim.length > 0 ? `${trimmed} ${unitTrim}` : trimmed
}

/**
 * Title line: `{±quantity} {stockUnit} · {coverageCut} {coverageUnit} · {before} → {after}`.
 * The amount leads with its direction sign; no-coverage categories drop the
 * coverage segment; pending rows (no running balance yet) drop the before→after
 * segment. The final-cut sequence and adjustment # are not in the title — the
 * sequence renders in the meta slot beside the status pill, and the adjustment #
 * is kept on the aria-label only.
 */
function buildAdjustmentTitle(row: {
  adjustmentType: "INCREASE" | "DEDUCTION"
  quantity: string
  coverage: string | null
  before: string | null
  after: string | null
  stockUnitAbbrev: string | null
  itemCoverageUnitAbbrev: string | null
}): string {
  const segments: string[] = []

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

  // Running-balance transition, units on both sides — only once the cut is
  // finalized and the before/after balance is stamped.
  if (row.before !== null && row.after !== null) {
    const unit = (row.stockUnitAbbrev ?? "").trim()
    segments.push(`${formatCutWithUnit(row.before, unit)} → ${formatCutWithUnit(row.after, unit)}`)
  }

  return segments.join(" · ")
}

/**
 * Subtitle lines: a single `Note: …` line, omitted when the cut has no note.
 * The running balance now rides in the title's before→after segment, so a cut
 * with no note shows no subtitle at all.
 */
function buildAdjustmentSubtitleLines(row: {
  notes: string
}): ReactNode[] {
  const lines: ReactNode[] = []

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
 * Row anatomy: the title packs the signed quantity + coverage cut + before→after
 * running balance (each with its own snapshot unit); the meta slot trails the
 * final-cut sequence next to the status badge; the subtitle carries only the
 * note. Units come from the row's own snapshot (each cut froze its UoM at
 * creation), not the parent inventory's current unit.
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
          meta={
            <span className="flex items-center gap-2">
              {row.finalSequence !== null ? <span>#{row.finalSequence}</span> : null}
              <AdjustmentStatusBadge status={row.status} />
            </span>
          }
          onClick={() => enterAdjustmentEditFromContext(row)}
          ariaLabel={`Edit adjustment ${row.adjustmentNumber}`}
        />
      ))}
    </HubSidePanelScrollList>
  )
}
