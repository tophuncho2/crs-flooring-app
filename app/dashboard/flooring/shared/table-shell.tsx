"use client"

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
  className,
}: {
  label: string
  colSpan: number
  className?: string
}) {
  return (
    <tr className={joinClasses("border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30", className)}>
      <td colSpan={colSpan} className="px-3 py-2 text-sm font-semibold text-blue-500">
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
