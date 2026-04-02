"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function normalizeCurrencyValue(value?: ReactNode) {
  if (typeof value !== "string") {
    return value
  }

  return value.trim().replace(/^\$/, "")
}

export function CurrencyCell({
  input,
  value,
  unit,
  className,
}: {
  input?: ReactNode
  value?: ReactNode
  unit?: ReactNode
  className?: string
}) {
  const normalizedValue = normalizeCurrencyValue(value)

  return (
    <div className={joinClasses("flex min-h-[2.5rem] w-full min-w-0 items-center gap-2.5 text-left tabular-nums", className)}>
      <div className="flex min-w-0 items-center gap-2 text-left tabular-nums">
        <span className="shrink-0 text-[var(--foreground)]/60">$</span>
        <div className={joinClasses("text-left", input ? "min-w-[6rem] flex-1" : "shrink-0 whitespace-nowrap")}>
          {input ?? <span className="text-sm text-[var(--foreground)]">{normalizedValue}</span>}
        </div>
      </div>
      {unit ? (
        <div className="shrink-0 whitespace-nowrap text-xs text-[var(--foreground)]/50">
          / {unit}
        </div>
      ) : null}
    </div>
  )
}
