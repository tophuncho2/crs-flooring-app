"use client"

import { type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function WarningNotice({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={joinClasses(
        "rounded-md border border-amber-500/50 bg-amber-500/15 px-4 py-3 text-sm font-semibold text-amber-800",
        className,
      )}
    >
      {children}
    </p>
  )
}
