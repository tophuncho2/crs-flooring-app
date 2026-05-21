"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Minimal labelled-control wrapper used inside inventory record-view
 * groups. Mirrors `WorkOrderField` / `TemplateField`, but stays
 * module-local so the groups don't pull in the `FieldSection`
 * placement primitives.
 *
 * Optional `currentLength` + `maxLength` render a `{n}/{max}` counter
 * to the right of the label when `editable` is true. Counter is hidden
 * in read-only mode and turns rose when at limit.
 */
export function InventoryField({
  label,
  children,
  className,
  editable,
  currentLength,
  maxLength,
}: {
  label: string
  children: ReactNode
  className?: string
  editable?: boolean
  currentLength?: number
  maxLength?: number
}) {
  const showCounter =
    editable === true && typeof currentLength === "number" && typeof maxLength === "number"
  const atMax = showCounter && (currentLength as number) >= (maxLength as number)
  return (
    <label className={joinClassNames("flex min-w-0 flex-col gap-1 text-sm", className)}>
      <span className="flex items-baseline justify-between gap-2 text-[var(--foreground)]/80">
        <span>{label}</span>
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
