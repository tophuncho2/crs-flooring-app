"use client"

import type { ReactNode } from "react"
import { DASHBOARD_PAGE_SHELL_CLASS_NAME } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { DashboardTableSurface } from "@/modules/shared/engines/common/display/dashboard-table-surface"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function DashboardListPageScaffold({
  title,
  controls,
  notices,
  table,
  pagination,
  pageClassName,
  surfaceClassName,
  contentClassName,
}: {
  title: ReactNode
  controls?: ReactNode
  notices?: ReactNode
  table: ReactNode
  pagination?: ReactNode
  pageClassName?: string
  surfaceClassName?: string
  contentClassName?: string
}) {
  return (
    <div className={joinClasses(DASHBOARD_PAGE_SHELL_CLASS_NAME, pageClassName)}>
      <DashboardTableSurface
        title={title}
        actions={controls}
        notices={notices}
        className={surfaceClassName}
        contentClassName={contentClassName}
      >
        {table}
        {pagination}
      </DashboardTableSurface>
    </div>
  )
}
