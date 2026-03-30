"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function QuantityCell({
  input,
  unit,
  className,
}: {
  input: ReactNode
  unit?: ReactNode
  className?: string
}) {
  return (
    <div className={joinClasses("flex min-h-[2.5rem] w-full min-w-0 items-center justify-center gap-2 text-center", className)}>
      <div className="min-w-0 shrink-0">{input}</div>
      {unit ? <div className="min-w-0 shrink-0 whitespace-nowrap text-xs text-[var(--foreground)]/55">{unit}</div> : null}
    </div>
  )
}
