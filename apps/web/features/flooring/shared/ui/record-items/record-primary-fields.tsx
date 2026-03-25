import type { ReactNode } from "react"
import { getFieldControlClassName } from "./record-field-errors"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function PrimaryRecordFieldsGrid({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinClasses("grid gap-4 md:grid-cols-2 xl:grid-cols-4", className)}>{children}</div>
}

export function RecordStaticFieldValue({
  children,
  hasError = false,
  className,
}: {
  children: ReactNode
  hasError?: boolean
  className?: string
}) {
  return (
    <div
      className={getFieldControlClassName(
        joinClasses("min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm", className),
        hasError,
      )}
    >
      {children}
    </div>
  )
}
