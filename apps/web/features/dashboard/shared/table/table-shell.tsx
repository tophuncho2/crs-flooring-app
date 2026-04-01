"use client"

import Link from "next/link"
import { type CSSProperties, type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export type TableBleedVariant = "dashboard" | "record" | "scoped"

export const PAGE_TABLE_HEAD_TONE_CLASS_NAME = "bg-[var(--panel-hover)] text-left"
export const MODAL_TABLE_HEAD_TONE_CLASS_NAME = "bg-[var(--subpanel-header-background)] text-left"
export const RECORD_TABLE_HEAD_TONE_CLASS_NAME = "bg-[var(--subpanel-background)] text-left"
export const PAGE_TABLE_GROUP_ROW_TONE_CLASS_NAME = "border-t border-[var(--panel-border)] bg-[var(--panel-hover)]"
export const MODAL_TABLE_GROUP_ROW_TONE_CLASS_NAME = "border-t border-[color:var(--subpanel-border)] bg-[var(--subpanel-header-background)]"
export const EMBEDDED_PAGE_TABLE_SHELL_CLASS_NAME = "rounded-none border-x-0 border-b-0 shadow-none"

function tableBleedClassName(variant: TableBleedVariant) {
  switch (variant) {
    case "dashboard":
      return "-mx-4 sm:-mx-5"
    case "record":
      return "-mx-5"
    case "scoped":
      return "-mx-4"
    default:
      return ""
  }
}

export function TableBleed({
  children,
  variant,
  className,
}: {
  children: ReactNode
  variant: TableBleedVariant
  className?: string
}) {
  return <div className={joinClasses("w-auto", tableBleedClassName(variant), className)}>{children}</div>
}

export function EmbeddedPageTableShell({
  children,
  minWidthClass,
  tableStyle,
  className,
}: {
  children: ReactNode
  minWidthClass?: string
  tableStyle?: CSSProperties
  className?: string
}) {
  return (
    <TableBleed variant="dashboard" className="overflow-x-auto overscroll-x-contain">
      <TableShell
        minWidthClass={minWidthClass}
        tableStyle={tableStyle}
        className={joinClasses(EMBEDDED_PAGE_TABLE_SHELL_CLASS_NAME, className)}
      >
        {children}
      </TableShell>
    </TableBleed>
  )
}

export function TableShell({
  children,
  minWidthClass,
  tableStyle,
  className,
}: {
  children: ReactNode
  minWidthClass?: string
  tableStyle?: CSSProperties
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        "w-full overflow-x-auto overscroll-x-contain rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-[0_12px_28px_rgba(0,0,0,0.1)]",
        className,
      )}
    >
      <table className={joinClasses("min-w-full w-max table-auto text-sm", minWidthClass)} style={tableStyle}>
        {children}
      </table>
    </div>
  )
}

export function RecordTableShell({
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
        "w-full overflow-x-auto overscroll-x-contain rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] shadow-[0_18px_40px_rgba(0,0,0,0.18)]",
        className,
      )}
    >
      <table className={joinClasses("min-w-full w-max table-auto text-sm", minWidthClass)}>{children}</table>
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
        "overflow-x-auto overscroll-x-contain rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] shadow-[0_18px_40px_rgba(0,0,0,0.22)]",
        className,
      )}
    >
      <table className={joinClasses("min-w-full w-max table-auto text-sm", minWidthClass)}>{children}</table>
    </div>
  )
}

export function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={joinClasses(PAGE_TABLE_HEAD_TONE_CLASS_NAME, "shadow-[inset_0_-1px_0_var(--panel-border)]", className)}>{children}</thead>
}

export function ModalTableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={joinClasses(MODAL_TABLE_HEAD_TONE_CLASS_NAME, className)}>{children}</thead>
}

export function RecordTableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={joinClasses(RECORD_TABLE_HEAD_TONE_CLASS_NAME, "shadow-[inset_0_-1px_0_var(--subpanel-border)]", className)}>{children}</thead>
}

export function TableHeaderCell({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={joinClasses("h-10 px-3 py-2", className)}>{children}</th>
}

export function DashboardTableCell({
  children,
  columnIndex,
  className,
}: {
  children: ReactNode
  columnIndex: number
  className?: string
}) {
  return (
    <td
      className={joinClasses(
        "px-3 py-2 align-top",
        columnIndex > 0 && "border-l border-[var(--panel-border)]",
        className,
      )}
    >
      {children}
    </td>
  )
}

export function TableGroupRow({
  label,
  colSpan,
  depth = 0,
  variant = "page",
  className,
}: {
  label: string
  colSpan: number
  depth?: number
  variant?: "page" | "modal"
  className?: string
}) {
  return (
    <tr
      className={joinClasses(
        variant === "modal" ? MODAL_TABLE_GROUP_ROW_TONE_CLASS_NAME : PAGE_TABLE_GROUP_ROW_TONE_CLASS_NAME,
        className,
      )}
    >
      <td
        colSpan={colSpan}
        className="px-3 py-2 text-sm font-semibold text-[var(--foreground)]/75"
        style={{ paddingLeft: `${0.75 + depth * 1.25}rem` }}
      >
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
