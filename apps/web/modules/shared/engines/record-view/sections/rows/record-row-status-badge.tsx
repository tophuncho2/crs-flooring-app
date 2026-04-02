import type { ReactNode } from "react"
import { RecordSectionStatusBadge } from "./record-section-action-panel"

export function RecordRowStatusBadge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode
  tone?: "neutral" | "warning" | "error" | "success" | "processing"
  className?: string
}) {
  return (
    <RecordSectionStatusBadge
      tone={tone}
      className={["min-w-[8.75rem] justify-center", className].filter(Boolean).join(" ")}
    >
      {children}
    </RecordSectionStatusBadge>
  )
}
