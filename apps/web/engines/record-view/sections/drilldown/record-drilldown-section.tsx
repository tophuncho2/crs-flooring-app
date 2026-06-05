"use client"

import { type ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { RecordSectionShell } from "../structure/record-section-shell"
import type { RecordPanelContext } from "../../panel/record-panel-config"

const DRILLDOWN_BACK_BUTTON_CLASS =
  "inline-flex cursor-pointer items-center gap-1 rounded-md border border-[var(--panel-border)] bg-transparent px-2.5 py-1 text-xs font-medium text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 focus:outline-none focus:ring-1 focus:ring-sky-500/40"

export type RecordDrilldownSectionProps = {
  /** Section title; stays visible in both the list and the drilled-in state. */
  title: string
  /** Controlled selection. `null` → show the list; a value → show the detail. */
  selectedId: string | null
  /** Selection setter — the consumer wires this to a URL search param. */
  onSelect: (id: string | null) => void
  /** Renders the list. `select` flips the section into the detail for that row. */
  renderList: (select: (id: string) => void) => ReactNode
  /** Renders the embedded detail for the selected row, given a back handler. */
  renderDetail: (id: string, onBack: () => void) => ReactNode
  /** Host page controller — its `confirmNavigation` guards the "back" action. */
  page: RecordPanelContext["page"]
  backLabel?: string
}

/**
 * Generic record-view section that flips in place between a **list** and an
 * **embedded detail**. When nothing is selected it renders the list; selecting
 * a row swaps the section body to the detail with a "← back" control that
 * returns to the list. Selection is fully **controlled** (`selectedId` /
 * `onSelect`) and the component is **routing-agnostic** — the consumer decides
 * whether the selection lives in a URL search param or local state.
 *
 * Back navigation routes through the host `page.confirmNavigation`, so unsaved
 * edits inside the embedded detail prompt the standard discard dialog before
 * the section flips back (one shared guard — no second page controller).
 */
export function RecordDrilldownSection({
  title,
  selectedId,
  onSelect,
  renderList,
  renderDetail,
  page,
  backLabel = "Back",
}: RecordDrilldownSectionProps) {
  if (selectedId === null) {
    return <RecordSectionShell title={title}>{renderList(onSelect)}</RecordSectionShell>
  }

  const handleBack = () => page.confirmNavigation(() => onSelect(null))

  return (
    <RecordSectionShell
      title={title}
      actions={
        <button type="button" className={DRILLDOWN_BACK_BUTTON_CLASS} onClick={handleBack}>
          <ArrowLeft size={12} />
          {backLabel}
        </button>
      }
    >
      {renderDetail(selectedId, handleBack)}
    </RecordSectionShell>
  )
}
