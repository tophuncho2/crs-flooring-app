import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
  RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
} from "../structure/record-section-tokens"

export type RecordSectionMetricValue = {
  label: string
  value: ReactNode
  className?: string
}

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
        "flex min-h-[3.25rem] min-w-[8rem] flex-col justify-start border px-3 py-2.5",
        RECORD_SECTION_BORDER_CLASS_NAME,
        RECORD_SECTION_ITEM_SURFACE_CLASS_NAME,
        className,
      )}
    >
      <div className="text-[10px] uppercase tracking-[0.14em] text-[var(--foreground)]/45">{label}</div>
      <div className="mt-1 text-sm font-semibold leading-tight text-[var(--foreground)]">{value}</div>
    </div>
  )
}
