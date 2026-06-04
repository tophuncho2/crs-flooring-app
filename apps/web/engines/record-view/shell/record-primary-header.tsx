import type { ReactNode } from "react"
import { RecordSectionHeader } from "../sections/structure/record-section-header"

export function RecordPrimaryHeader({
  title,
  onToggle,
  isOpen,
  headerMeta,
  headerActions,
}: {
  title: string
  onToggle?: () => void
  isOpen?: boolean
  headerMeta?: ReactNode
  headerActions?: ReactNode
}) {
  return (
    <RecordSectionHeader
      title={title}
      isOpen={Boolean(isOpen)}
      onToggle={onToggle ?? (() => {})}
      metrics={headerMeta}
      actions={headerActions}
    />
  )
}
