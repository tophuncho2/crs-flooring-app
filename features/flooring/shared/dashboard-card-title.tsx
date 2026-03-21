import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export const DASHBOARD_CARD_TITLE_CLASS_NAME = "text-2xl font-bold text-blue-500"
export const DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME = "pt-24 sm:pt-28"
export const DASHBOARD_PAGE_SHELL_CLASS_NAME = joinClasses(
  "min-h-screen bg-[var(--background)] px-1 pb-12 text-[var(--foreground)] sm:px-2 lg:px-3",
  DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME,
)
export const DASHBOARD_PAGE_SHELL_DENSE_CLASS_NAME = joinClasses(
  "min-h-screen bg-[var(--background)] px-1 pb-6 text-[var(--foreground)] sm:px-2 lg:px-3",
  DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME,
)
export const DASHBOARD_PAGE_SHELL_SHORT_CLASS_NAME = joinClasses(
  "min-h-screen bg-[var(--background)] px-1 pb-8 text-[var(--foreground)] sm:px-2 lg:px-3",
  DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME,
)
export const DASHBOARD_PAGE_SHELL_WIDE_CLASS_NAME = joinClasses(
  "min-h-screen bg-[var(--background)] px-2 pb-12 text-[var(--foreground)] sm:px-3 lg:px-4",
  DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME,
)

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
