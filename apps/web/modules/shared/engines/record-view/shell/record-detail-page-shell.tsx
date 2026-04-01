import type { ReactNode } from "react"
import { DASHBOARD_PAGE_SHELL_WIDE_EDGE_TO_EDGE_CLASS_NAME } from "@/modules/shared/engines/common/display/dashboard-card-title"
import { RECORD_DETAIL_PANEL_WIDTH_CLASS } from "./record-panel-width"
import { RecordBackButton } from "./record-action-buttons"
import { RecordPrimaryHeader } from "./record-primary-header"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordDetailPageShell({
  title,
  backHref,
  backLabel = "Back",
  onBack,
  onHeaderToggle,
  isHeaderExpanded,
  headerMeta,
  headerActions,
  headerVariant = "default",
  children,
  sizeClass = RECORD_DETAIL_PANEL_WIDTH_CLASS,
}: {
  title: string
  backHref: string
  backLabel?: string
  onBack?: () => void
  onHeaderToggle?: () => void
  isHeaderExpanded?: boolean
  headerMeta?: ReactNode
  headerActions?: ReactNode
  headerVariant?: "default" | "section"
  children: ReactNode
  sizeClass?: string
}) {
  const backButton = onBack ? (
    <RecordBackButton onClick={onBack} label={backLabel} className={joinClasses(onHeaderToggle && "relative z-[2]")} />
  ) : (
    <RecordBackButton href={backHref} label={backLabel} className={joinClasses(onHeaderToggle && "relative z-[2]")} />
  )

  return (
    <div className={DASHBOARD_PAGE_SHELL_WIDE_EDGE_TO_EDGE_CLASS_NAME}>
      <div className={joinClasses("mx-auto w-full", sizeClass)}>
        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl">
          {headerVariant === "section" ? (
            <RecordPrimaryHeader
              title={title}
              backHref={backHref}
              backLabel={backLabel}
              onBack={onBack}
              isOpen={Boolean(isHeaderExpanded)}
              onToggle={onHeaderToggle}
              headerMeta={headerMeta}
              headerActions={headerActions}
            />
          ) : (
            <div className="relative border-b border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
              {onHeaderToggle ? (
                <button
                  type="button"
                  onClick={onHeaderToggle}
                  aria-expanded={isHeaderExpanded}
                  aria-label={isHeaderExpanded ? `Collapse ${title}` : `Expand ${title}`}
                  className="absolute inset-0 z-0 w-full text-left transition-all duration-200 hover:bg-[var(--panel-hover)]/35 hover:shadow-[0_0_18px_rgba(59,130,246,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
                />
              ) : null}
              <div className="relative z-[1] flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className={joinClasses("flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between", onHeaderToggle && "pointer-events-none")}>
                      <div className="inline-flex w-fit max-w-full items-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2">
                        <h1 className="truncate text-lg font-semibold">{title}</h1>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                        {headerMeta ? <div className="min-w-0 flex-1">{headerMeta}</div> : null}
                        {headerActions ? <div className={joinClasses("shrink-0", onHeaderToggle && "pointer-events-auto")}>{headerActions}</div> : null}
                      </div>
                    </div>
                  </div>
                  {backButton}
                </div>
              </div>
            </div>
          )}
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
