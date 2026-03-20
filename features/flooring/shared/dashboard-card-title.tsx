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

export function DashboardCardHeader({
  title,
  actions,
}: {
  title: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div>
        <DashboardCardTitle>{title}</DashboardCardTitle>
      </div>
      {actions ? <div>{actions}</div> : null}
    </div>
  )
}
