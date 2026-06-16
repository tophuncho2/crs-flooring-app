"use client"

import type { TemplateDetail } from "@builders/domain"
import { TemplateReferenceRow } from "./template-reference-row"

/**
 * The templates reference-header body (rendered inside the shared
 * `RecordReferenceHeader` card). Display-only: it shows the selected template as
 * the same list-view row the list shows (reusing the list `DataTable` columns +
 * cell renderer). During the brief load window `templateDetail` is null, so it
 * falls back to the label from cascade state. The labeled card chrome and the
 * "+ Template" action live above this body.
 */
export function TemplateRecordHeader({
  templateDetail,
  templateLabel,
}: {
  templateDetail: TemplateDetail | null
  templateLabel: string | null
}) {
  if (!templateDetail) {
    return (
      <p className="truncate text-sm font-medium text-[var(--foreground)]">
        {templateLabel ?? "No template selected"}
      </p>
    )
  }

  return <TemplateReferenceRow template={templateDetail} />
}
