"use client"

import type { ReactNode } from "react"

export function GridEmpty({
  children,
  className,
}: {
  children?: ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        "px-4 py-8 text-center text-sm text-[var(--foreground)]/65",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children ?? "No rows yet."}
    </div>
  )
}
