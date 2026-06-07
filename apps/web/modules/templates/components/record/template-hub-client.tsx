"use client"

import { useCallback, useMemo } from "react"
import {
  RecordDetailClientScaffold,
  RecordReferenceHeader,
  ReferenceHeaderClearButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  CascadePickerBody,
  CascadePickerTriggers,
  PickerAddButton,
  type CascadePickerController,
} from "@/engines/picker"
import type { TemplateDetail } from "@builders/domain"
import { TemplateRecordPanel } from "./template-record-panel"
import {
  useTemplateHubController,
  type TemplateHubController,
  type TemplateHubInitialSelections,
} from "@/modules/templates/controllers/record/use-template-hub-controller"

/**
 * The single templates page ("template hub"). The top section is the shared
 * cascade picker (Management Company → Property → Template); selecting a
 * template loads the *editable* template record below (its primary +
 * material-items sections). Re-selecting swaps the record in place. Opened from
 * every template entry point (list / MC / work-order / create) with the
 * template pre-selected, or from the app-shell icon in the empty state.
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
      title="Template sync"
      backHref={backHref}
      dirtyMessage=""
      modeNotice={{ mode: "edit", label: "Template" }}
    >
      {(page) => (
        <RecordReferenceHeader
          page={page}
          discardMessage="This template has unsaved changes. Switching templates will discard them."
        >
          {({ guard }) => <TemplateHubView page={page} controller={controller} guard={guard} />}
        </RecordReferenceHeader>
      )}
    </RecordDetailClientScaffold>
  )
}

const PROMPT_CARD_CLASS =
  "rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-10 text-center text-sm text-[var(--foreground)]/65"

function TemplateHubView({
  page,
  controller,
  guard,
}: {
  page: RecordDetailClientScaffoldContext
  controller: TemplateHubController
  /** Discard-guard from the shared reference-header primitive. */
  guard: (action: () => void) => void
}) {
  const {
    cascade,
    steps,
    templateDetail,
    isTemplateLoading,
    templateError,
    clear,
    newTemplate,
    openManagementCompany,
    openProperty,
  } = controller

  const guardedCascade = useMemo<CascadePickerController>(
    () => ({
      ...cascade,
      selectManagementCompany: (option) => guard(() => cascade.selectManagementCompany(option)),
      selectProperty: (option) => guard(() => cascade.selectProperty(option)),
      selectTemplate: (option) => guard(() => cascade.selectTemplate(option)),
    }),
    [cascade, guard],
  )

  const handleClear = useCallback(() => guard(() => clear()), [guard, clear])

  const isPickerExpanded = cascade.expandedStep !== null

  return (
    <div className="flex flex-col gap-4">
      <CascadePickerTriggers
        controller={guardedCascade}
        error={templateError}
        onOpenManagementCompany={openManagementCompany}
        onOpenProperty={openProperty}
        actions={
          <>
            <PickerAddButton label="+ Template" onClick={newTemplate} />
            <ReferenceHeaderClearButton
              disabled={!cascade.hasSelections}
              onClick={handleClear}
            />
          </>
        }
      />

      {isPickerExpanded ? <CascadePickerBody controller={guardedCascade} steps={steps} /> : null}

      {/* Kept mounted while a picker is browsed so unsaved record edits survive. */}
      <div className={isPickerExpanded ? "hidden" : undefined}>
        {isTemplateLoading ? (
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
