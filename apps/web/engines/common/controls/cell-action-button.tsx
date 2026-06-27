"use client"

import type { ReactNode } from "react"
import { Plus } from "lucide-react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/** Visual tones for the icon button. `neutral` is the default open/add chrome;
 *  `destructive` is the rose delete chrome (see `RecordDeleteButton`). */
const TONE_CLASS_NAME = {
  neutral:
    "border-[var(--panel-border)] text-[var(--foreground)]/70 hover:bg-[var(--panel-border)]/30 hover:text-[var(--foreground)] focus:ring-sky-500/40 disabled:hover:text-[var(--foreground)]/70",
  destructive:
    "border-rose-500/40 text-rose-700 hover:bg-rose-500/20 hover:text-rose-800 focus:ring-rose-500/40 disabled:hover:text-rose-700",
} as const

export type CellActionButtonTone = keyof typeof TONE_CLASS_NAME

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
  /** Visual tone. Defaults to `neutral`. */
  tone?: CellActionButtonTone
  /** Icon override. Defaults are set by the `RecordOpenButton` / `CellAddButton` presets. */
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
 * Prefer the presets: `RecordOpenButton` (launch → open the linked record, in
 * `record-open-button.tsx`) and `CellAddButton` (plus → create a linked record).
 */
export function CellActionButton({
  onClick,
  ariaLabel,
  title,
  disabled = false,
  tone = "neutral",
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
        "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-transparent transition focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent",
        TONE_CLASS_NAME[tone],
        className,
      )}
    >
      {icon ?? null}
    </button>
  )
}

/** Plus affordance — creates a new linked record (e.g. "+ New property"). */
export function CellAddButton({ icon, ...props }: CellActionButtonProps) {
  return <CellActionButton {...props} icon={icon ?? <Plus size={14} aria-hidden="true" />} />
}
