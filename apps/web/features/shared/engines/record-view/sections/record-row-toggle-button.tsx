"use client"

import { ChevronDown, ChevronRight } from "lucide-react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordRowToggleButton({
  expanded,
  onToggle,
  collapsedLabel = "Show",
  expandedLabel = "Hide",
  ariaLabel,
  className,
}: {
  expanded: boolean
  onToggle: () => void
  collapsedLabel?: string
  expandedLabel?: string
  ariaLabel?: string
  className?: string
}) {
  const label = expanded ? expandedLabel : collapsedLabel

  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={ariaLabel ?? label}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        onToggle()
      }}
      onKeyDown={(event) => {
        event.stopPropagation()
      }}
      className={joinClasses(
        "inline-flex min-h-[2.5rem] items-center justify-center gap-2 rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--panel-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20",
        className,
      )}
    >
      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      <span>{label}</span>
    </button>
  )
}
