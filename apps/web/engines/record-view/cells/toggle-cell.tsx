"use client"

import type { CellProps } from "./contracts/cell-base"

export type ToggleCellProps = CellProps<boolean>

/**
 * Lever / switch boolean cell — a cleaner alternative to {@link CheckboxCell}
 * for flags that read better as on/off (e.g. "Waste"). Editable mode renders an
 * accessible `role="switch"` button with a sliding knob; static mode renders the
 * same lever, non-interactive and dimmed. Honors the shared {@link CellProps}
 * editability contract, so it drops into a `FormField` exactly like any cell.
 */
export function ToggleCell(props: ToggleCellProps) {
  const on = props.value
  const trackClass = on
    ? "border-emerald-500/70 bg-emerald-500/70"
    : "border-[var(--panel-border)] bg-[var(--subpanel-background)]"
  const knobClass = on ? "translate-x-[18px]" : "translate-x-0.5"

  if (props.editable) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={props.ariaLabel}
        onClick={() => props.onChange?.(!on)}
        className={[
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40",
          trackClass,
          props.className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span
          className={[
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform",
            knobClass,
          ].join(" ")}
        />
      </button>
    )
  }

  return (
    <span
      role="switch"
      aria-checked={on}
      aria-disabled
      aria-label={props.ariaLabel}
      className={[
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border opacity-60",
        trackClass,
        props.className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className={[
          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm",
          knobClass,
        ].join(" ")}
      />
    </span>
  )
}
