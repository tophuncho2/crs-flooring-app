"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function TextCell({
  children,
  align = "left",
  noWrap = true,
  className,
}: {
  children: ReactNode
  align?: "left" | "center" | "right"
  noWrap?: boolean
  className?: string
}) {
  const alignmentClassName =
    align === "center"
      ? "justify-center text-center"
      : align === "right"
        ? "justify-end text-right"
        : "justify-start text-left"

  return (
    <div
      className={joinClasses(
        "flex min-h-[2.5rem] w-full min-w-0 items-center text-sm text-[var(--foreground)]",
        alignmentClassName,
        noWrap ? "whitespace-nowrap" : undefined,
        className,
      )}
    >
      <div className={joinClasses("min-w-0 flex-1", noWrap ? "truncate" : undefined)}>{children}</div>
    </div>
  )
}
