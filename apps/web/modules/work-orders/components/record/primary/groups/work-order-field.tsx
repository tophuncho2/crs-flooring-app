"use client"

import type { ReactNode } from "react"

function joinClassNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(" ")
}

/**
 * Minimal labelled-control wrapper used inside WO record-view groups.
 * Mirrors the visual shape of `@/components/fields` `FormField` (the
 * primitive the WO record view is opting out of), but local to this
 * module so the groups don't pull in the `FieldSection` placement
 * primitives.
 */
export function WorkOrderField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={joinClassNames("flex min-w-0 flex-col gap-1 text-sm", className)}>
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}
