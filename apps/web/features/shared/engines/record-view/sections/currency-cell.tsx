import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "./record-section-tokens"

export function CurrencyCell({
  input,
  value,
  unit,
  className,
}: {
  input?: ReactNode
  value?: ReactNode
  unit?: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "inline-flex min-h-[2.5rem] max-w-full items-center justify-end gap-1 rounded border px-2 py-1 text-right tabular-nums",
        RECORD_SECTION_BORDER_CLASS_NAME,
        className,
      )}
    >
      <span className="shrink-0 text-[var(--foreground)]/60">$</span>
      <div className="min-w-0 text-right [input]:text-right">{input ?? value}</div>
      {unit ? <span className="shrink-0 whitespace-nowrap text-xs text-[var(--foreground)]/50">/ {unit}</span> : null}
    </div>
  )
}
