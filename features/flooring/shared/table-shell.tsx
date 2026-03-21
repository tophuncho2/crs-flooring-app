"use client"

import Link from "next/link"
import { type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function TableShell({
  children,
  minWidthClass,
  className,
}: {
  children: ReactNode
  minWidthClass: string
  className?: string
}) {
  return (
    <div className={joinClasses("overflow-x-auto rounded-lg border border-[var(--panel-border)]", className)}>
      <table className={joinClasses("w-full text-sm", minWidthClass)}>{children}</table>
    </div>
  )
}

export function ModalTableShell({
  children,
  minWidthClass,
  className,
}: {
  children: ReactNode
  minWidthClass: string
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        "overflow-x-auto rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] shadow-[0_18px_40px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      <table className={joinClasses("w-full text-sm", minWidthClass)}>{children}</table>
    </div>
  )
}

export function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={joinClasses("bg-[var(--panel-hover)] text-left", className)}>{children}</thead>
}

export function ModalTableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={joinClasses("bg-[var(--subpanel-header-background)] text-left", className)}>{children}</thead>
}

export function TableHeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={joinClasses("h-10 px-3 py-2", className)}>{children}</th>
}

export function TableGroupRow({
  label,
  colSpan,
  depth = 0,
  className,
}: {
  label: string
  colSpan: number
  depth?: number
  className?: string
}) {
  return (
    <tr className={joinClasses("border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30", className)}>
      <td colSpan={colSpan} className="px-3 py-2 text-sm font-semibold text-blue-500" style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}>
        {label}
      </td>
    </tr>
  )
}

export function TableEmptyRow({
  message,
  colSpan,
}: {
  message: string
  colSpan: number
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-8 text-center text-[var(--foreground)]/70">
        {message}
      </td>
    </tr>
  )
}

export function TableSectionMeta({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinClasses("mt-6 mb-4 flex items-center justify-between", className)}>{children}</div>
}

export function TableActionsSummary({
  count,
  children,
  className,
}: {
  count: number
  children: ReactNode
  className?: string
}) {
  return (
    <div className={joinClasses("flex flex-col gap-2 md:items-end", className)}>
      {children}
      <span className="text-xs text-[var(--foreground)]/60">{count} total</span>
    </div>
  )
}

export function ClickableTableRow({
  children,
  onClick,
  className,
  ariaLabel,
}: {
  children: ReactNode
  onClick: () => void
  className?: string
  ariaLabel: string
}) {
  return (
    <tr
      tabIndex={0}
      role="button"
      aria-label={ariaLabel}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick()
        }
      }}
      className={joinClasses(
        "cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50",
        className,
      )}
    >
      {children}
    </tr>
  )
}

export function TablePaginationControls({
  page,
  totalPages,
  pageSize,
  totalItems,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  previousPageHref,
  nextPageHref,
  className,
}: {
  page: number
  totalPages: number
  pageSize: number
  totalItems: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  onPreviousPage?: () => void
  onNextPage?: () => void
  previousPageHref?: string
  nextPageHref?: string
  className?: string
}) {
  if (totalItems <= pageSize && totalPages <= 1) {
    return null
  }

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className={joinClasses("mt-3 flex items-center justify-between gap-3", className)}>
      <span className="text-xs text-[var(--foreground)]/60">
        Showing {start}-{end} of {totalItems}
      </span>
      <div className="flex items-center gap-2">
        {previousPageHref ? (
          hasPreviousPage ? (
            <Link
              href={previousPageHref}
              className="rounded border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold"
            >
              Previous
            </Link>
          ) : (
            <span className="rounded border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold opacity-50">
              Previous
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage}
            className="rounded border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
        )}
        <span className="text-xs text-[var(--foreground)]/60">
          Page {page} of {totalPages}
        </span>
        {nextPageHref ? (
          hasNextPage ? (
            <Link
              href={nextPageHref}
              className="rounded border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold"
            >
              Next
            </Link>
          ) : (
            <span className="rounded border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold opacity-50">
              Next
            </span>
          )
        ) : (
          <button
            type="button"
            onClick={onNextPage}
            disabled={!hasNextPage}
            className="rounded border border-[var(--panel-border)] px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
