"use client"

import type { ReactNode } from "react"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
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
 * sequence and no-coverage categories drop the coverage segment. Cut log #
 * is intentionally omitted from the display (kept on the aria-label only).
 */
function buildCutLogTitle(row: {
  cut: string
  coverageCut: string | null
  finalCutSequence: number | null
  stockUnitAbbrev: string | null
  itemCoverageUnitAbbrev: string | null
}): string {
  const segments: string[] = []
  if (row.finalCutSequence !== null) segments.push(`#${row.finalCutSequence}`)

  const cut = formatCutWithUnit(row.cut, row.stockUnitAbbrev ?? "")
  if (cut !== EMPTY_CELL) segments.push(cut)

  if (row.coverageCut !== null && row.coverageCut.trim().length > 0) {
    segments.push(formatCutWithUnit(row.coverageCut, row.itemCoverageUnitAbbrev ?? ""))
  }

  return segments.join(" · ")
}

/**
 * Subtitle lines: a labelled `Before … → After …` line (only once the cut is
 * finalized and the running balance is stamped) followed by a `Note: …` line.
 * Each is omitted when its data is absent — a fresh pending cut shows just its
 * note, or nothing.
 */
function buildCutLogSubtitleLines(row: {
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
        <span className={LABEL_CLASS}>Before </span>
        <span className={VALUE_CLASS}>{row.before}</span>
        <span className={LABEL_CLASS}> → After </span>
        <span className={VALUE_CLASS}>{row.after}</span>
        {unit.length > 0 ? <span className={LABEL_CLASS}>{` ${unit}`}</span> : null}
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
 * Infinite-scroll cut-logs list inside the inventory hub. Mirrors the property
 * hub's properties-list section: each row is clickable; click transitions the
 * panel into `section-edit-cut-log` mode for that row.
 *
 * Row anatomy: the title packs cut / coverage cut / final-cut sequence (each
 * with its own snapshot unit) with the status badge trailing in the meta slot;
 * the subtitle stacks a labelled before/after line and the note. Units come
 * from the row's own snapshot (each cut froze its UoM at creation), not the
 * parent inventory's current unit.
 *
 * Reuses the same query key the inline `InventoryCutLogsSection` does, so
 * mutations refresh both surfaces with one cache invalidation.
 */
export function InventoryHubCutLogsListSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { cutLogs, enterCutLogEditFromContext } = controller
  const { rows, hasData, isEmpty, isError, hasMore, isFetchingMore, loadMore } = cutLogs

  return (
    <HubSidePanelScrollList
      title="Cut Logs"
      hasData={hasData}
      isEmpty={isEmpty}
      isError={isError}
      errorMessage="Could not load cut logs."
      loadingMessage="Loading cut logs…"
      emptyMessage="No cut logs on this inventory."
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
      onLoadMore={loadMore}
    >
      {rows.map((row) => (
        <HubSidePanelScopedRow
          key={row.id}
          primary={buildCutLogTitle(row)}
          secondaryLines={buildCutLogSubtitleLines(row)}
          meta={<CutLogStatusBadge status={row.status} />}
          onClick={() => enterCutLogEditFromContext(row)}
          ariaLabel={`Edit cut log ${row.cutLogNumber}`}
        />
      ))}
    </HubSidePanelScrollList>
  )
}
