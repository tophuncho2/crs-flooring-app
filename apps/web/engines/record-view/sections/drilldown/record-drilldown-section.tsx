"use client"

import { type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import type { RecordPanelContext } from "../../panel/record-panel-config"

const DRILLDOWN_BACK_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40"

export type RecordDrilldownSectionProps = {
  /** Controlled selection. `null` → show the list; a value → show the detail. */
  selectedId: string | null
  /** Selection setter — the consumer wires this to a URL search param. */
  onSelect: (id: string | null) => void
  /** Renders the list. `select` flips the section into the detail for that row.
   *  The consumer owns the list's chrome (its own light section card + title). */
  renderList: (select: (id: string) => void) => ReactNode
  /** Renders the embedded detail for the selected row, given a back handler. */
  renderDetail: (id: string, onBack: () => void) => ReactNode
  /** Host page controller — its `confirmNavigation` guards the "back" action. */
  page: RecordPanelContext["page"]
  backLabel?: string
}

/**
 * Generic record-view section that flips in place between a **list** and an
 * **embedded detail**. When nothing is selected it renders the list as-is (the
 * consumer supplies its own light section card); selecting a row swaps the
 * section body to a light "← back" bar plus the detail. Selection is fully
 * **controlled** (`selectedId` / `onSelect`) and the component is
 * **routing-agnostic** — the consumer decides whether the selection lives in a
 * URL search param or local state. The primitive itself paints no section
 * header, so it stays lean for reuse (e.g. inventory ⇄ adjustments).
 *
 * Back navigation routes through the host `page.confirmNavigation`, so unsaved
 * edits inside the embedded detail prompt the standard discard dialog before
 * the section flips back (one shared guard — no second page controller).
 */
export function RecordDrilldownSection({
  selectedId,
  onSelect,
  renderList,
  renderDetail,
  page,
  backLabel = "Back",
}: RecordDrilldownSectionProps) {
  if (selectedId === null) {
    return <>{renderList(onSelect)}</>
  }

  const handleBack = () => page.confirmNavigation(() => onSelect(null))

  return (
    <div>
      <div className="flex items-center border-b border-[var(--panel-border)] px-4 py-3">
        <button type="button" className={DRILLDOWN_BACK_BUTTON_CLASS} onClick={handleBack}>
          <ArrowLeft size={12} />
          {backLabel}
        </button>
      </div>
      {renderDetail(selectedId, handleBack)}
    </div>
  )
}
