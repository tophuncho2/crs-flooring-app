"use client"

import { StatusBadge } from "@/engines/common"
import type { CellProps, CellTone } from "./contracts/cell-base"

const ALIGN_CLASS_NAME = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
} as const

/**
 * Selected-segment fill per tone. Mirrors the `StatusBadge` palette but a
 * touch stronger so the chosen option reads as "filled". The container owns
 * the border, so each button only sets background + text colour.
 */
const ACTIVE_TONE_CLASS_NAME: Record<CellTone, string> = {
  default: "bg-[var(--foreground)]/10 text-[var(--foreground)]",
  success: "bg-emerald-500/15 text-emerald-700",
  warning: "bg-amber-500/20 text-amber-800",
  error: "bg-rose-500/15 text-rose-800",
  processing: "bg-blue-500/15 text-blue-800",
  muted: "bg-stone-200/50 text-stone-700",
}

const IDLE_CLASS_NAME =
  "text-[var(--foreground)]/65 hover:bg-[var(--foreground)]/5 hover:text-[var(--foreground)]"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type SegmentedChoiceOption = {
  value: string
  label: string
  /** Drives the selected fill colour (edit) + the static badge tone. */
  tone?: CellTone
  disabled?: boolean
}

export type SegmentedChoiceCellProps = CellProps<string> & {
  options: ReadonlyArray<SegmentedChoiceOption>
}

/**
 * Mutually-exclusive segmented toggle cell. Unlike `SelectCell` there is no
 * empty option — when `value` matches none of the options, *no* segment is
 * pressed (the "nothing chosen yet" state). The selected segment fills with
 * its option `tone`. Read-only mode renders the matched option as a coloured
 * `StatusBadge`.
 */
export function SegmentedChoiceCell(props: SegmentedChoiceCellProps) {
  const align = props.align ?? "start"

  if (!props.editable) {
    const matched = props.options.find((option) => option.value === props.value)
    if (!matched) {
      return (
        <span
          aria-label={props.ariaLabel}
          className={joinClassNames("block text-sm text-[var(--foreground)]/70", props.className)}
        >
          -
        </span>
      )
    }
    return (
      <span className={joinClassNames("flex", ALIGN_CLASS_NAME[align], props.className)}>
        <StatusBadge tone={matched.tone}>{matched.label}</StatusBadge>
      </span>
    )
  }

  return (
    <div
      role="radiogroup"
      aria-label={props.ariaLabel}
      aria-invalid={props.invalid || undefined}
      className={joinClassNames(
        "inline-flex w-full items-stretch gap-0.5 rounded-md border bg-[var(--panel-background)] p-0.5 transition",
        props.invalid ? "border-rose-500/60" : "border-[var(--panel-border)]",
        props.className,
      )}
    >
      {props.options.map((option) => {
        const isActive = props.value === option.value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={option.disabled}
            onClick={() => props.onChange?.(option.value)}
            className={joinClassNames(
              "flex-1 rounded px-2 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
              isActive ? ACTIVE_TONE_CLASS_NAME[option.tone ?? "default"] : IDLE_CLASS_NAME,
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
