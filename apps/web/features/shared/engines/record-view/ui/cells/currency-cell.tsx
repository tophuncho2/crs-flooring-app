"use client"

import type { ReactNode } from "react"
import { TextCell } from "./text-cell"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
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
  return (
    <div className={joinClasses("flex min-h-[2.5rem] w-full min-w-0 items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 text-left tabular-nums">
        <span className="shrink-0 text-[var(--foreground)]/60">$</span>
        <div className="min-w-0 flex-1 text-left [input]:w-full [input]:text-right">
          {input ?? <TextCell align="left">{value}</TextCell>}
        </div>
      </div>
      <div className="min-w-[4.5rem] shrink-0 text-right text-xs text-[var(--foreground)]/50">
        {unit ? <span className="whitespace-nowrap">/ {unit}</span> : <span className="invisible">/ unit</span>}
      </div>
    </div>
  )
}
