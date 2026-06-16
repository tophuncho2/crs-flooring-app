"use client"

import type { ReactNode } from "react"
import { Pencil, Plus } from "lucide-react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type CellActionButtonProps = {
  /** Click handler. Ignored when `disabled`. */
  onClick: () => void
  /** Required for accessibility — describes the action ("Open property"). */
  ariaLabel: string
  /** Optional title attribute — tooltip (also useful to explain a disabled state). */
  title?: string
  /**
   * Disables the button. This gates on *availability* (e.g. no record is
   * selected yet, so there's nothing to open), not editability — the consumer
   * decides when to render and when to disable.
   */
  disabled?: boolean
  /** Icon override. Defaults are set by the `CellOpenButton` / `CellAddButton` presets. */
  icon?: ReactNode
  className?: string
}

/**
 * Small icon-only button for in-field actions, sitting in a `FormField`'s
 * label-row `actions` slot (so it never disturbs the value control or the
 * invisible-grid footprint). Mirrors `RowActionButton`: `type="button"` and an
 * unconditional `stopPropagation` so a click never bubbles to a parent row's
 * `onClick`. Routing/handlers are injected by the consumer — the engine carries
 * no navigation dependency.
 *
 * Prefer the `CellOpenButton` (pencil → open linked record) and `CellAddButton`
 * (plus → create linked record) presets below.
 */
export function CellActionButton({
  onClick,
  ariaLabel,
  title,
  disabled = false,
  icon,
  className,
}: CellActionButtonProps) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation()
        if (!disabled) onClick()
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      className={joinClassNames(
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--panel-border)] bg-transparent text-[var(--foreground)]/70 transition hover:bg-[var(--panel-border)]/30 hover:text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--foreground)]/70",
        className,
      )}
    >
      {icon ?? null}
    </button>
  )
}

/** Pencil affordance — opens the field's linked record (MC / Property / Template). */
export function CellOpenButton({ icon, ...props }: CellActionButtonProps) {
  return <CellActionButton {...props} icon={icon ?? <Pencil size={14} aria-hidden="true" />} />
}

/** Plus affordance — creates a new linked record (e.g. "+ New property"). */
export function CellAddButton({ icon, ...props }: CellActionButtonProps) {
  return <CellActionButton {...props} icon={icon ?? <Plus size={14} aria-hidden="true" />} />
}
