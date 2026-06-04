"use client"

import { RecordDetailClientScaffold, type RecordDetailClientScaffoldContext } from "@/engines/record-view"
import { TemplateRecordPanel } from "./template-record-panel"
import type { TemplateDetail } from "@builders/domain"

export function TemplateDetailClient({
  template,
  backHref,
}: {
  template: TemplateDetail
  backHref: string
}) {
  return (
    <RecordDetailClientScaffold
      title={`Template ${template.templateNumber}`}
      backHref={backHref}
      dirtyMessage="You have unsaved template changes. Leave this template without saving?"
      headerVariant="section"
    >
      {(page: RecordDetailClientScaffoldContext) => (
        <TemplateRecordPanel page={page} template={template} />
      )}
    </RecordDetailClientScaffold>
  )
}
