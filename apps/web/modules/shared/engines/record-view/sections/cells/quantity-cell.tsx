"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function QuantityCell({
  input,
  className,
}: {
  input: ReactNode
  className?: string
}) {
  return (
    <div className={joinClasses("flex min-h-[2.5rem] w-full min-w-0 items-center justify-center gap-2 text-center", className)}>
      <div className="min-w-0 flex-1">{input}</div>
    </div>
  )
}
