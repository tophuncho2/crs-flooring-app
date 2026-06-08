"use client"

import type { CellProps } from "./contracts/cell-base"

const ALIGN_CLASS_NAME = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const

const SELECT_BASE_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
const SELECT_INVALID_CLASS_NAME = "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/40"
const STATIC_BASE_CLASS_NAME = "block truncate text-sm"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type SelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type SelectCellProps = CellProps<string> & {
  options: ReadonlyArray<SelectOption>
  placeholder?: string
}

/**
 * Native `<select>` cell. Light-weight alternative to DropdownCell when the
 * options are plain strings with no icons / hints / styling needs.
 */
export function SelectCell(props: SelectCellProps) {
  const align = props.align ?? "start"

  if (props.editable) {
    return (
      <select
        value={props.value}
        onChange={(event) => props.onChange?.(event.target.value)}
        aria-label={props.ariaLabel}
        aria-invalid={props.invalid || undefined}
        className={joinClassNames(
          SELECT_BASE_CLASS_NAME,
          ALIGN_CLASS_NAME[align],
          props.invalid ? SELECT_INVALID_CLASS_NAME : undefined,
          props.className,
        )}
      >
        {props.placeholder ? <option value="">{props.placeholder}</option> : null}
        {props.options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  const matched = props.options.find((option) => option.value === props.value)
  return (
    <span
      aria-label={props.ariaLabel}
      className={joinClassNames(STATIC_BASE_CLASS_NAME, ALIGN_CLASS_NAME[align], props.className)}
    >
      {matched?.label || props.value || "-"}
    </span>
  )
}
