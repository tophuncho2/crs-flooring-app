import Link from "next/link"
import type { ReactNode } from "react"
import { ArrowLeft } from "lucide-react"
import { DASHBOARD_PAGE_SHELL_WIDE_CLASS_NAME } from "@/features/flooring/shared/ui/display/dashboard-card-title"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordDetailPageShell({
  title,
  backHref,
  backLabel = "Back",
  onBack,
  headerMeta,
  headerActions,
  children,
  sizeClass = "max-w-6xl",
}: {
  title: string
  backHref: string
  backLabel?: string
  onBack?: () => void
  headerMeta?: ReactNode
  headerActions?: ReactNode
  children: ReactNode
  sizeClass?: string
}) {
  return (
    <div className={DASHBOARD_PAGE_SHELL_WIDE_CLASS_NAME}>
      <div className={joinClasses("mx-auto w-full", sizeClass)}>
        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl">
          <div className="border-b border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="inline-flex w-fit max-w-full items-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2">
                      <h1 className="truncate text-lg font-semibold">{title}</h1>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                      {headerMeta ? <div className="min-w-0 flex-1">{headerMeta}</div> : null}
                      {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
                    </div>
                  </div>
                </div>
                {onBack ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
                  >
                    <ArrowLeft size={16} />
                    <span>{backLabel}</span>
                  </button>
                ) : (
                  <Link
                    href={backHref}
                    className="inline-flex items-center gap-2 rounded-md border border-[var(--panel-border)] px-3 py-2 text-sm text-[var(--foreground)]/80 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
                  >
                    <ArrowLeft size={16} />
                    <span>{backLabel}</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
          <div className="px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}
