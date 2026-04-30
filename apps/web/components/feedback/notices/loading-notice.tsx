"use client"

import { type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function LoadingNotice({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={joinClasses(
        "rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-700",
        className,
      )}
    >
      {children}
    </p>
  )
}
