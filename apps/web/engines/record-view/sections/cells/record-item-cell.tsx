import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "../structure/record-section-tokens"
import { getRecordRowColumnStyle, useRecordRowColumn } from "../rows/record-row-layout"

export function RecordItemCell({
  label,
  children,
  columnKey,
  className,
  contentClassName,
  labelClassName,
  align,
  tone = "default",
  density = "default",
  showLabel = true,
  chrome = "card",
}: {
  label?: string
  children: ReactNode
  columnKey?: string
  className?: string
  contentClassName?: string
  labelClassName?: string
  align?: "start" | "center" | "end"
  tone?: "default" | "allocation"
  density?: "default" | "compact"
  showLabel?: boolean
  chrome?: "card" | "grid"
}) {
  const column = useRecordRowColumn(columnKey)
  const resolvedAlign = align ?? column?.align ?? "start"
  const densityClassName = density === "compact" ? "px-2.5 py-2" : "px-3 py-3"
  const resolvedTone = tone === "default" ? (column?.tone ?? "default") : tone
  const toneClassName = resolvedTone === "allocation" ? "bg-orange-500/[0.08]" : undefined
  const defaultLabelClassName = density === "compact" ? "text-[9px] text-[var(--foreground)]/55" : undefined
  const resolvedLabel = label ?? column?.label ?? ""
  const contentAlignClassName =
    resolvedAlign === "center"
      ? "items-center text-center"
      : resolvedAlign === "end"
        ? "items-end text-right"
        : "items-start text-left"
  const cellStyle = chrome === "grid" ? undefined : getRecordRowColumnStyle(column ?? undefined)

  return (
    <div
      className={joinRecordSectionClasses(
        "min-w-0 self-stretch",
        chrome === "card" ? "border shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]" : undefined,
        densityClassName,
        chrome === "card" ? toneClassName : undefined,
        chrome === "card" ? RECORD_SECTION_BORDER_CLASS_NAME : undefined,
        chrome === "card" ? RECORD_SECTION_ITEM_SURFACE_CLASS_NAME : undefined,
        className,
      )}
      style={cellStyle}
    >
      {showLabel && resolvedLabel ? (
        <div
          className={joinRecordSectionClasses(
            "mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--foreground)]/45",
            defaultLabelClassName,
            labelClassName,
          )}
        >
          {resolvedLabel}
        </div>
      ) : null}
      <div
        className={joinRecordSectionClasses(
          "flex min-h-[2.5rem] w-full min-w-0 justify-center overflow-visible",
          contentAlignClassName,
          contentClassName,
        )}
      >
        {children}
      </div>
    </div>
  )
}
