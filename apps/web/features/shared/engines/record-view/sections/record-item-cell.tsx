import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "./record-section-tokens"
import { getRecordRowColumnStyle, useRecordRowColumn } from "./record-row-layout"

export function RecordItemCell({
  label,
  children,
  columnKey,
  className,
  contentClassName,
  labelClassName,
  align,
}: {
  label: string
  children: ReactNode
  columnKey?: string
  className?: string
  contentClassName?: string
  labelClassName?: string
  align?: "start" | "center" | "end"
}) {
  const column = useRecordRowColumn(columnKey)
  const resolvedAlign = align ?? column?.align ?? "start"
  const contentAlignClassName =
    resolvedAlign === "center"
      ? "items-center text-center"
      : resolvedAlign === "end"
        ? "items-end text-right"
        : "items-start text-left"

  return (
    <div
      className={joinRecordSectionClasses(
        "min-w-0 shrink-0 border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        RECORD_SECTION_BORDER_CLASS_NAME,
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
      style={getRecordRowColumnStyle(column ?? undefined)}
    >
      <div
        className={joinRecordSectionClasses(
          "mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--foreground)]/45",
          labelClassName,
        )}
      >
        {label}
      </div>
      <div className={joinRecordSectionClasses("flex min-h-[2.5rem] min-w-0 flex-col justify-center", contentAlignClassName, contentClassName)}>
        {children}
      </div>
    </div>
  )
}
