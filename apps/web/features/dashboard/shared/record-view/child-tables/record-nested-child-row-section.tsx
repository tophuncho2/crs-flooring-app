"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordNestedChildRowSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinClasses("w-full", className)}>{children}</div>
}
