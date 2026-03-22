import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordSummaryGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinClasses("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>
}
