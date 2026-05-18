"use client"

import { ChevronDown, ChevronUp } from "lucide-react"

type Props = {
  collapsed: boolean
  onToggle: () => void
  label?: string
}

export function TemplateSyncSectionToggleButton({
  collapsed,
  onToggle,
  label = "Toggle template details",
}: Props) {
  const Icon = collapsed ? ChevronDown : ChevronUp
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-expanded={!collapsed}
      className="inline-flex items-center justify-center rounded border border-[var(--panel-border)] px-2 py-1 text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)]"
    >
      <Icon size={14} />
    </button>
  )
}
