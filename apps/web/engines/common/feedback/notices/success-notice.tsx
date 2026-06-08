"use client"

import { type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function SuccessNotice({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={joinClasses(
        "rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600",
        className,
      )}
    >
      {children}
    </p>
  )
}
