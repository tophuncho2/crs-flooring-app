"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Minimal labelled-control wrapper used inside products record-view
 * groups. Mirrors `InventoryField` / `WorkOrderField` / `TemplateField`,
 * module-local so the groups don't pull in the engine's `FieldSection`
 * placement primitives.
 *
 * Optional `currentLength` + `maxLength` render a `{n}/{max}` counter
 * to the right of the label when `editable` is true. Counter is hidden
 * in read-only mode and turns rose when at limit.
 */
export function ProductField({
  label,
  children,
  className,
  editable,
  required,
  currentLength,
  maxLength,
}: {
  label: string
  children: ReactNode
  className?: string
  editable?: boolean
  /** Visually marks the label as required (rose asterisk). Pure UI; no validation. */
  required?: boolean
  currentLength?: number
  maxLength?: number
}) {
  const showCounter =
    editable === true && typeof currentLength === "number" && typeof maxLength === "number"
  const atMax = showCounter && (currentLength as number) >= (maxLength as number)
  return (
    <label className={joinClassNames("flex min-w-0 flex-col gap-1 text-sm", className)}>
      <span className="flex items-baseline justify-between gap-2 text-[var(--foreground)]/80">
        <span className="flex items-center gap-1">
          {label}
          {required ? <span aria-hidden="true" className="text-rose-600">*</span> : null}
        </span>
        {showCounter ? (
          <span
            className={joinClassNames(
              "text-[10px] tabular-nums",
              atMax ? "text-rose-700" : "text-[var(--foreground)]/55",
            )}
          >
            {currentLength}/{maxLength}
          </span>
        ) : null}
      </span>
      {children}
    </label>
  )
}
