import type { ReactNode } from "react"
import {
  joinRecordSectionClasses,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "./record-section-tokens"

export function QuantityCell({
  input,
  unit,
  className,
}: {
  input: ReactNode
  unit?: ReactNode
  className?: string
}) {
  return (
    <div
      className={joinRecordSectionClasses(
        "inline-flex min-h-[2.5rem] min-w-[10.5rem] max-w-full items-center justify-center gap-2 rounded border px-2 py-1 text-center",
        RECORD_SECTION_BORDER_CLASS_NAME,
        className,
      )}
    >
      <div className="min-w-0 text-center [input]:text-center">{input}</div>
      {unit ? <div className="min-w-0 whitespace-nowrap text-xs text-[var(--foreground)]/55">{unit}</div> : null}
    </div>
  )
}
