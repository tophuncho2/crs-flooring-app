"use client"

import type { CellProps } from "./contracts/cell-base"

export type CheckboxCellProps = CellProps<boolean>

/**
 * Boolean cell. Used for batch-selection columns (the row-checkbox column on a
 * grid that drives a multi-row action) and for any other simple
 * editable-boolean field. Static mode renders a non-interactive checked or
 * empty indicator.
 */
export function CheckboxCell(props: CheckboxCellProps) {
  if (props.editable) {
    return (
      <div className={["flex items-center justify-center", props.className].filter(Boolean).join(" ")}>
        <input
          type="checkbox"
          checked={props.value}
          onChange={(event) => props.onChange?.(event.target.checked)}
          aria-label={props.ariaLabel}
          className="h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] text-sky-600 focus:ring-1 focus:ring-sky-500/40"
        />
      </div>
    )
  }

  return (
    <div className={["flex items-center justify-center", props.className].filter(Boolean).join(" ")}>
      <span
        aria-label={props.ariaLabel}
        className={[
          "inline-block h-3.5 w-3.5 rounded border",
          props.value
            ? "border-emerald-500/45 bg-emerald-500/15"
            : "border-[var(--panel-border)] bg-transparent",
        ].join(" ")}
      />
    </div>
  )
}
