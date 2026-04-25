"use client"

import type { CellProps } from "./contracts/cell-base"

const ALIGN_CLASS_NAME = {
  start: "text-left",
  center: "text-center",
  end: "text-right",
} as const

const TONE_CLASS_NAME = {
  default: "text-[var(--foreground)]",
  success: "text-emerald-700",
  warning: "text-amber-800",
  error: "text-rose-800",
  processing: "text-blue-800",
  muted: "text-[var(--foreground)]/60",
} as const

const INPUT_BASE_CLASS_NAME =
  "w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] tabular-nums outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
const INPUT_INVALID_CLASS_NAME = "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/40"
const STATIC_BASE_CLASS_NAME = "block truncate text-sm tabular-nums"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type NumberCellProps = CellProps<string> & {
  placeholder?: string
  /** HTML `inputmode` for editable mode; default `"decimal"`. */
  inputMode?: "numeric" | "decimal"
}

/**
 * Numeric cell. Value is held as a string at this layer (matches wire shape);
 * concrete number coercion happens at the boundary. `align` defaults to "end"
 * to match conventional numeric column alignment, but consumers can override.
 */
export function NumberCell(props: NumberCellProps) {
  const align = props.align ?? "end"
  const tone = props.tone ?? "default"
  const inputMode = props.inputMode ?? "decimal"

  if (props.editable) {
    return (
      <input
        type="text"
        inputMode={inputMode}
        value={props.value}
        onChange={(event) => props.onChange?.(event.target.value)}
        placeholder={props.placeholder ?? "0.00"}
        aria-label={props.ariaLabel}
        aria-invalid={props.invalid || undefined}
        className={joinClassNames(
          INPUT_BASE_CLASS_NAME,
          ALIGN_CLASS_NAME[align],
          TONE_CLASS_NAME[tone],
          props.invalid ? INPUT_INVALID_CLASS_NAME : undefined,
          props.className,
        )}
      />
    )
  }

  return (
    <span
      aria-label={props.ariaLabel}
      className={joinClassNames(
        STATIC_BASE_CLASS_NAME,
        ALIGN_CLASS_NAME[align],
        TONE_CLASS_NAME[tone],
        props.className,
      )}
    >
      {props.value || "-"}
    </span>
  )
}
