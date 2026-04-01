"use client"

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export type RecordGridCellKind =
  | "text"
  | "select"
  | "number"
  | "quantity"
  | "unit"
  | "currency"
  | "status"
  | "open"
  | "toggle"
  | "remove"
  | "notes"
  | "readonly-value"

export type RecordRowColumnSpec = {
  key: string
  minWidth: number | string
  label?: string
  kind?: RecordGridCellKind
  preferredWidth?: number | string
  grow?: number
  align?: "start" | "center" | "end"
  editable?: boolean
  tone?: "default" | "allocation"
}

export type RecordGridColumnSpec = RecordRowColumnSpec

type ResolvedRecordRowColumnSpec = Required<
  Pick<RecordRowColumnSpec, "key" | "label" | "kind" | "minWidth" | "preferredWidth" | "grow" | "align" | "editable" | "tone">
>

type RecordRowContextValue = Map<string, ResolvedRecordRowColumnSpec>

const RecordRowContext = createContext<RecordRowContextValue | null>(null)

function toCssLength(value: number | string) {
  return typeof value === "number" ? `${value / 16}rem` : value
}

function humanizeColumnKey(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function resolveRecordRowColumnSpec(
  column: RecordRowColumnSpec | undefined,
): ResolvedRecordRowColumnSpec {
  const kind = column?.kind ?? "text"
  const minWidth = column?.minWidth ?? 192
  const preferredWidth = column?.preferredWidth ?? minWidth
  const align =
    column?.align
    ?? (kind === "status" || kind === "open" || kind === "toggle"
      ? "center"
      : kind === "remove" || kind === "currency" || kind === "number"
        ? "end"
        : "start")

  return {
    key: column?.key ?? "column",
    label: column?.label ?? humanizeColumnKey(column?.key ?? "column"),
    kind,
    minWidth,
    preferredWidth,
    grow: column?.grow ?? 1,
    align,
    editable: column?.editable ?? false,
    tone: column?.tone ?? "default",
  }
}

export function getRecordRowColumnStyle(column: RecordRowColumnSpec | undefined): CSSProperties {
  const resolvedColumn = resolveRecordRowColumnSpec(column)
  const preferredWidth = toCssLength(resolvedColumn.preferredWidth)

  return {
    flexBasis: "auto",
    flexGrow: resolvedColumn.grow,
    flexShrink: 0,
    minWidth: preferredWidth,
    width: "max-content",
    maxWidth: "none",
  }
}

function buildRecordRowTemplateColumns(columns: RecordRowColumnSpec[]) {
  return columns
    .map((column) => {
      const resolvedColumn = resolveRecordRowColumnSpec(column)
      const preferredWidth = toCssLength(resolvedColumn.preferredWidth)
      const growValue = Number.isFinite(resolvedColumn.grow) && resolvedColumn.grow > 0
        ? resolvedColumn.grow
        : 1

      return `minmax(${preferredWidth}, ${growValue}fr)`
    })
    .join(" ")
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
  const columnMap = useMemo(
    () => new Map(columns.map((column) => {
      const resolvedColumn = resolveRecordRowColumnSpec(column)
      return [resolvedColumn.key, resolvedColumn]
    })),
    [columns],
  )

  return (
    <RecordRowContext.Provider value={columnMap}>
      <div
        className={joinClasses("grid w-max min-w-full max-w-none items-stretch gap-0", className)}
        style={{ gridTemplateColumns: buildRecordRowTemplateColumns(columns) }}
      >
        {children}
      </div>
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
