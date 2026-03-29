"use client"

import type { ReactNode } from "react"
import { RecordSectionStatusBadge } from "./record-section-action-panel"

export function RecordSectionSaveStateIndicators({
  isDirty,
  isSaving,
  hasConflict,
  extra,
}: {
  isDirty: boolean
  isSaving: boolean
  hasConflict: boolean
  extra?: ReactNode
}) {
  return (
    <>
      <RecordSectionStatusBadge tone={isSaving ? "processing" : isDirty ? "warning" : "success"}>
        {isSaving ? "Saving" : isDirty ? "Dirty" : "Saved"}
      </RecordSectionStatusBadge>
      {hasConflict ? <RecordSectionStatusBadge tone="error">Conflict</RecordSectionStatusBadge> : null}
      {extra}
    </>
  )
}
