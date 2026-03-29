import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "./record-section-tokens"

export function RecordItemCell({
  label,
  children,
  className,
  contentClassName,
  labelClassName,
}: {
  label: string
  children: ReactNode
  className?: string
  contentClassName?: string
  labelClassName?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "min-w-0 border px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]",
        RECORD_SECTION_BORDER_CLASS_NAME,
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      <div
        className={joinRecordSectionClasses(
          "mb-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--foreground)]/45",
          labelClassName,
        )}
      >
        {label}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  )
}
