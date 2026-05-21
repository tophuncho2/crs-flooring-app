"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

const ARROW_BUTTON_CLASS_NAME =
  "flex h-7 w-7 items-center justify-center rounded text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] disabled:cursor-not-allowed disabled:opacity-40"

export type HubSidePanelViewSwitcherProps = {
  /** Visible label for the current view. */
  label: string
  /** Disabled state for the previous-view chevron. */
  prevDisabled?: boolean
  /** Disabled state for the next-view chevron. */
  nextDisabled?: boolean
  onGoPrev: () => void
  onGoNext: () => void
  prevAriaLabel?: string
  nextAriaLabel?: string
}

/**
 * Centered view-tab switcher: ◂ Label ▸. Reused across hub-panel views that
 * tab between sibling lists (e.g. Properties ↔ Templates).
 */
export function HubSidePanelViewSwitcher({
  label,
  prevDisabled,
  nextDisabled,
  onGoPrev,
  onGoNext,
  prevAriaLabel,
  nextAriaLabel,
}: HubSidePanelViewSwitcherProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-1 py-1">
      <button
        type="button"
        onClick={onGoPrev}
        disabled={prevDisabled}
        aria-label={prevAriaLabel}
        className={ARROW_BUTTON_CLASS_NAME}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/75">
        {label}
      </span>
      <button
        type="button"
        onClick={onGoNext}
        disabled={nextDisabled}
        aria-label={nextAriaLabel}
        className={ARROW_BUTTON_CLASS_NAME}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
