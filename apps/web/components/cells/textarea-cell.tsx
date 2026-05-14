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
  "w-full resize-y rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2.5 py-1.5 text-sm text-[var(--foreground)] outline-none transition focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 disabled:cursor-not-allowed disabled:opacity-60"
const INPUT_INVALID_CLASS_NAME = "border-rose-500/60 focus:border-rose-500/70 focus:ring-rose-500/40"
const STATIC_BASE_CLASS_NAME = "block whitespace-pre-wrap text-sm"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

export type TextareaCellProps = CellProps<string> & {
  placeholder?: string
  maxLength?: number
  /** Visible row count when editable; default `3`. */
  rows?: number
}

/**
 * Multi-line text cell. Renders as `<textarea>` when `editable: true`; renders
 * as a styled `<p>` preserving line breaks when `editable: false`.
 */
export function TextareaCell(props: TextareaCellProps) {
  const align = props.align ?? "start"
  const tone = props.tone ?? "default"
  const rows = props.rows ?? 3

  if (props.editable) {
    return (
      <textarea
        value={props.value}
        onChange={(event) => props.onChange?.(event.target.value)}
        placeholder={props.placeholder}
        maxLength={props.maxLength}
        rows={rows}
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
    <p
      aria-label={props.ariaLabel}
      className={joinClassNames(
        STATIC_BASE_CLASS_NAME,
        ALIGN_CLASS_NAME[align],
        TONE_CLASS_NAME[tone],
        props.className,
      )}
    >
      {props.value || "-"}
    </p>
  )
}
