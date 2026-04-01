"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function LineItemQuantityField({
  input,
  unit,
  className,
}: {
  input: ReactNode
  unit: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        "inline-flex min-w-[10.5rem] max-w-full items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1",
        className,
      )}
    >
      <div className="flex-none">{input}</div>
      <div className="ml-auto min-w-0 flex-none text-xs text-[var(--foreground)]/55">{unit}</div>
    </div>
  )
}

export function LineItemPriceField({
  input,
  unit,
  className,
}: {
  input: ReactNode
  unit: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        "inline-flex max-w-full items-center gap-2 rounded border border-[var(--panel-border)] px-2 py-1",
        className,
      )}
    >
      <span className="flex-none text-[var(--foreground)]/60">$</span>
      <div className="flex-none">{input}</div>
      <span className="flex-none whitespace-nowrap text-xs text-[var(--foreground)]/50">/ {unit}</span>
    </div>
  )
}

export function LineItemTotalField({
  value,
  className,
}: {
  value: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        "inline-flex min-w-[7.5rem] items-center justify-end rounded border border-[var(--panel-border)] px-2 py-1 font-medium",
        className,
      )}
    >
      {value}
    </div>
  )
}
