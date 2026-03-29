"use client"

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export type RecordRowColumnSpec = {
  key: string
  minWidth: number | string
  grow?: number
  align?: "start" | "center" | "end"
}

type RecordRowContextValue = Map<string, RecordRowColumnSpec>

const RecordRowContext = createContext<RecordRowContextValue | null>(null)

function toCssLength(value: number | string) {
  return typeof value === "number" ? `${value / 16}rem` : value
}

export function getRecordRowColumnStyle(column: RecordRowColumnSpec | undefined): CSSProperties {
  const minWidth = toCssLength(column?.minWidth ?? 192)
  const grow = column?.grow ?? 1
  return {
    flexBasis: minWidth,
    minWidth,
    flexGrow: grow,
    flexShrink: 1,
  }
}

export function RecordRowLayout({
  columns,
  children,
  className,
}: {
  columns: RecordRowColumnSpec[]
  children: ReactNode
  className?: string
}) {
  const columnMap = useMemo(() => new Map(columns.map((column) => [column.key, column])), [columns])

  return (
    <RecordRowContext.Provider value={columnMap}>
      <div className={joinClasses("flex w-max min-w-full items-stretch gap-0", className)}>{children}</div>
    </RecordRowContext.Provider>
  )
}

export function useRecordRowColumn(columnKey?: string) {
  const context = useContext(RecordRowContext)
  if (!context || !columnKey) {
    return null
  }

  return context.get(columnKey) ?? null
}
