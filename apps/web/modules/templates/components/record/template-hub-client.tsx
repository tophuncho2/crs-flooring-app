"use client"

import {
  RecordDetailClientScaffold,
  RecordReferenceHeader,
  ReferenceHeaderAddButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { TemplateDetail } from "@builders/domain"
import { TemplateRecordPanel } from "./template-record-panel"
import { TemplateRecordHeader } from "./header/template-record-header"
import {
  useTemplateHubController,
  type TemplateHubController,
  type TemplateHubInitialSelections,
} from "@/modules/templates/controllers/record/use-template-hub-controller"

/**
 * The single templates page ("template hub"). The top section is the reference
 * header: a labeled card showing the selected template as its list row (display
 * only) with a "+ Template" action; the *editable* record (primary +
 * material-items sections) loads below. Opened from every template entry point
 * (list / MC / work-order / create) with the template pre-selected.
 */
export function TemplateHubClient({
  backHref,
  initialSelections,
  initialTemplate,
}: {
  backHref: string
  initialSelections?: TemplateHubInitialSelections
  initialTemplate?: TemplateDetail | null
}) {
  const controller = useTemplateHubController({ initialSelections, initialTemplate })

  return (
    <RecordDetailClientScaffold
      title="Templates Hub"
      backHref={backHref}
      dirtyMessage=""
      headerVariant="section"
    >
      {(page) => <TemplateHubView page={page} controller={controller} />}
    </RecordDetailClientScaffold>
  )
}

const PROMPT_CARD_CLASS =
  "rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-10 text-center text-sm text-[var(--foreground)]/65"

function TemplateHubView({
  page,
  controller,
}: {
  page: RecordDetailClientScaffoldContext
  controller: TemplateHubController
}) {
  const { cascade, templateDetail, isTemplateLoading, templateError, newTemplate } = controller

  // The reference header is display-only now — it shows the selected template as
  // its list row and offers "+ Template"; the record below is always editable.
  // (Re-selecting / swapping the active template in place has been removed.)
  return (
    <div className="flex flex-col gap-4">
      <RecordReferenceHeader
        page={page}
        label="Template"
        actions={() => <ReferenceHeaderAddButton label="+ Template" onClick={newTemplate} />}
      >
        {() => (
          <TemplateRecordHeader
            templateDetail={templateDetail}
            templateLabel={cascade.templateLabel}
          />
        )}
      </RecordReferenceHeader>

      <div>
        {templateError ? (
          <div className={PROMPT_CARD_CLASS}>{templateError}</div>
        ) : isTemplateLoading ? (
          <div className={PROMPT_CARD_CLASS}>Loading template…</div>
        ) : templateDetail ? (
          <TemplateRecordPanel key={templateDetail.id} page={page} template={templateDetail} />
        ) : (
          <div className={PROMPT_CARD_CLASS}>Select a template to view and edit it.</div>
        )}
      </div>
    </div>
  )
}
