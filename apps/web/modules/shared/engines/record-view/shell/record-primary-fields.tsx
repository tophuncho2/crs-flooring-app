import type { ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

function getFieldControlClassName(className: string, hasError: boolean) {
  return joinClasses(
    className,
    hasError ? "border-rose-500/70 bg-rose-500/5 ring-1 ring-rose-500/20" : null,
  )
}

export type RecordPrimaryFieldSize = "sm" | "md" | "lg"

const PRIMARY_FIELD_CELL_SIZE_CLASS_NAMES: Record<RecordPrimaryFieldSize, string> = {
  sm: "md:col-span-1 xl:col-span-2",
  md: "md:col-span-1 xl:col-span-3",
  lg: "md:col-span-2 xl:col-span-6",
}

export function RecordPrimarySection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={joinClasses("grid gap-4 xl:grid-cols-12", className)}>{children}</div>
}

export function RecordPrimaryPane({
  variant,
  placement,
  children,
  className,
}: {
  variant: "side" | "main"
  placement?: "left" | "right"
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        "rounded-xl border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.16)]",
        variant === "side" ? "xl:col-span-3" : "xl:col-span-9",
        placement === "left" ? "xl:order-1" : null,
        placement === "right" ? "xl:order-2" : null,
        className,
      )}
    >
      {children}
    </div>
  )
}

export function RecordPrimaryFieldsGrid({
  children,
  variant = "main",
  className,
}: {
  children: ReactNode
  variant?: "side" | "main"
  className?: string
}) {
  return (
    <div
      className={joinClasses(
        variant === "side" ? "grid gap-4 grid-cols-1" : "grid gap-4 md:grid-cols-2 xl:grid-cols-6",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function RecordPrimaryFieldCell({
  children,
  size = "sm",
  className,
}: {
  children: ReactNode
  size?: RecordPrimaryFieldSize
  className?: string
}) {
  return <div className={joinClasses(PRIMARY_FIELD_CELL_SIZE_CLASS_NAMES[size], className)}>{children}</div>
}

export function RecordStaticFieldValue({
  children,
  hasError = false,
  size = "sm",
  wrap,
  className,
}: {
  children: ReactNode
  hasError?: boolean
  size?: RecordPrimaryFieldSize
  wrap?: boolean
  className?: string
}) {
  const shouldWrap = wrap ?? size !== "sm"

  return (
    <div
      className={getFieldControlClassName(
        joinClasses(
          "min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm",
          shouldWrap ? "whitespace-pre-wrap break-words" : "truncate whitespace-nowrap",
          className,
        ),
        hasError,
      )}
    >
      {children}
    </div>
  )
}
