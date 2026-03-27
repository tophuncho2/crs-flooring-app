"use client"

import type { ReactNode } from "react"
import {
  DASHBOARD_SURFACE_CARD_CLASS_NAME,
  DASHBOARD_SURFACE_HEADER_BLEED_CLASS_NAME,
  DashboardCardHeader,
} from "./dashboard-card-title"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function DashboardTableSurface({
  title,
  actions,
  notices,
  children,
  className,
  contentClassName,
}: {
  title: ReactNode
  actions?: ReactNode
  notices?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section className={joinClasses(DASHBOARD_SURFACE_CARD_CLASS_NAME, className)}>
      <div className={DASHBOARD_SURFACE_HEADER_BLEED_CLASS_NAME}>
        <DashboardCardHeader title={title} actions={actions} />
        {notices ? <div className="mt-3">{notices}</div> : null}
      </div>
      <div className={joinClasses("mt-6", contentClassName)}>{children}</div>
    </section>
  )
}
