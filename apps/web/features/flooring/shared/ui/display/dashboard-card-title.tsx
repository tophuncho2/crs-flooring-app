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
export const DASHBOARD_PAGE_SHELL_EDGE_TO_EDGE_CLASS_NAME = joinClasses(
  "min-h-screen bg-[var(--background)] px-0 pb-12 text-[var(--foreground)]",
  DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME,
)
export const DASHBOARD_PAGE_SHELL_WIDE_CLASS_NAME = joinClasses(
  "min-h-screen bg-[var(--background)] px-3 pb-12 text-[var(--foreground)] sm:px-6",
  DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME,
)
export const DASHBOARD_PAGE_SHELL_WIDE_EDGE_TO_EDGE_CLASS_NAME = joinClasses(
  "min-h-screen bg-[var(--background)] px-0 pb-12 text-[var(--foreground)]",
  DASHBOARD_PAGE_TOP_PADDING_CLASS_NAME,
)
export const DASHBOARD_SURFACE_CARD_CLASS_NAME =
  "w-full overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 shadow-xl sm:p-5"
export const DASHBOARD_SURFACE_HEADER_BLEED_CLASS_NAME =
  "-mx-4 -mt-4 px-4 pt-4 pb-4 sm:-mx-5 sm:-mt-5 sm:px-5 sm:pt-5 sm:pb-5"

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
