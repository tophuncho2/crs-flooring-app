"use client"

import {
  RecordDetailClientScaffold,
  RecordStepperPortal,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type { TemplateDetail } from "@builders/domain"
import { TemplateRecordPanel } from "./template-record-panel"
import {
  useTemplateHubController,
  type TemplateHubController,
  type TemplateHubInitialSelections,
} from "@/modules/templates/controllers/record/use-template-hub-controller"

/**
 * The single templates page ("template hub"). Loads the *editable* record
 * (primary + planned-products sections) for the selected template. Opened from
 * every template entry point (list / entity / work-order / create) with the
 * template pre-selected.
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
  const { templateDetail, isTemplateLoading, templateError, stepToTemplate } = controller

  if (templateError) {
    return <div className={PROMPT_CARD_CLASS}>{templateError}</div>
  }
  if (isTemplateLoading) {
    return <div className={PROMPT_CARD_CLASS}>Loading template…</div>
  }
  if (!templateDetail) {
    return null
  }
  const { previousTemplate, nextTemplate } = templateDetail
  return (
    <>
      {/* Top-bar stepper — walks the global template-number line. Mounted here
          (not in the keyed panel below) so it survives the panel's per-step
          remount and holds its label steady across the neighbor load. */}
      <RecordStepperPortal
        label={templateDetail.templateNumber}
        isDirty={page.isDirty}
        discardMessage="This template has unsaved changes. Stepping to another template will discard them."
        onPrevious={previousTemplate ? () => stepToTemplate(previousTemplate) : null}
        onNext={nextTemplate ? () => stepToTemplate(nextTemplate) : null}
      />
      <TemplateRecordPanel
        key={templateDetail.id}
        page={page}
        template={templateDetail}
      />
    </>
  )
}
