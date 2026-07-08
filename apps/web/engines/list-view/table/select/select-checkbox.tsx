"use client"

export type DataTableSelectCheckboxProps = {
  checked: boolean
  /** When false, renders a static (non-interactive) indicator. */
  editable: boolean
  onChange: () => void
  ariaLabel: string
  /** Mixed state (some-but-not-all selected) — used by the header select-all. */
  indeterminate?: boolean
}

/**
 * Row-selection checkbox for the `DataTable` selection column. List-view-local
 * (the engine can't reach record-view's `CheckboxCell`); mirrors that cell's
 * editable / static rendering so the affordance reads identically everywhere.
 */
export function DataTableSelectCheckbox({
  checked,
  editable,
  onChange,
  ariaLabel,
  indeterminate = false,
}: DataTableSelectCheckboxProps) {
  if (editable) {
    return (
      <div className="flex items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          // `indeterminate` is a DOM-only property (no HTML attribute), so it is
          // set imperatively via a ref each render.
          ref={(el) => {
            if (el) el.indeterminate = indeterminate
          }}
          onChange={onChange}
          aria-label={ariaLabel}
          className="h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] text-sky-600 focus:ring-1 focus:ring-sky-500/40"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <span
        aria-label={ariaLabel}
        className={[
          "inline-block h-3.5 w-3.5 rounded border",
          checked
            ? "border-emerald-500/45 bg-emerald-500/15"
            : "border-[var(--panel-border)] bg-transparent",
        ].join(" ")}
      />
    </div>
  )
}
