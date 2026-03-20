import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export const DASHBOARD_CARD_TITLE_CLASS_NAME = "text-2xl font-bold text-blue-500"

export function DashboardCardTitle({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <h1 className={joinClasses(DASHBOARD_CARD_TITLE_CLASS_NAME, className)}>{children}</h1>
}
