"use client"

import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordSectionStack({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={joinClasses("divide-y divide-[color:var(--subpanel-border)]", className)}>
      {children}
    </div>
  )
}

export function RecordSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={joinClasses("py-6 first:pt-0 last:pb-0", className)}>{children}</section>
}

export function RecordSectionDivider({
  className,
}: {
  className?: string
}) {
  return <div className={joinClasses("border-t border-[color:var(--subpanel-border)]", className)} aria-hidden="true" />
}
