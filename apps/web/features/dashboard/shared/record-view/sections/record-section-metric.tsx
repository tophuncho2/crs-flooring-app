import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "@/features/dashboard/shared/record-view/sections/record-section-tokens"

export function RecordSectionMetric({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "min-w-[8rem] border px-3 py-2",
        RECORD_SECTION_BORDER_CLASS_NAME,
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--foreground)]/45">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--foreground)]">{value}</div>
    </div>
  )
}
