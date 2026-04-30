import type { ReactNode } from "react"
import { RecordSectionHeader } from "@/components/sections/structure/record-section-header"
import { RecordBackButton } from "@/components/panels/record-action-buttons"

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ")
}

export function RecordPrimaryHeader({
  title,
  backHref,
  backLabel = "Back",
  onBack,
  onToggle,
  isOpen,
  headerMeta,
  headerActions,
}: {
  title: string
  backHref: string
  backLabel?: string
  onBack?: () => void
  onToggle?: () => void
  isOpen?: boolean
  headerMeta?: ReactNode
  headerActions?: ReactNode
}) {
  const backButton = onBack ? (
    <RecordBackButton onClick={onBack} label={backLabel} className={joinClasses(onToggle && "relative z-[2]")} />
  ) : (
    <RecordBackButton href={backHref} label={backLabel} className={joinClasses(onToggle && "relative z-[2]")} />
  )

  return (
    <RecordSectionHeader
      title={title}
      isOpen={Boolean(isOpen)}
      onToggle={onToggle ?? (() => {})}
      metrics={headerMeta}
      actions={
        <div className="flex items-center gap-2">
          {headerActions}
          {backButton}
        </div>
      }
    />
  )
}
