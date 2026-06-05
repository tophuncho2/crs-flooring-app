"use client"

import { useCallback, useMemo, useState } from "react"
import {
  RecordDetailClientScaffold,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  CascadePickerBody,
  CascadePickerTriggers,
  type CascadePickerController,
} from "@/engines/cascade-picker"
import { HubSidePanelAddButton } from "@/components/hub-side-panel"
import { SidePanelPreviewClearButton } from "@/components/side-panel-preview"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import { TemplateRecordPanel } from "@/modules/templates/components/record/template-record-panel"
import type { TemplateDetail } from "@builders/domain"
import {
  useTemplateSyncController,
  type TemplateSyncController,
  type TemplateSyncInitialSelections,
} from "@/modules/template-sync/controllers/use-template-sync-controller"

/**
 * Combined template-sync page. The top section is the shared cascade picker
 * (Management Company → Property → Template); selecting a template loads the
 * *editable* template record below (its primary + material-items sections,
 * reused verbatim from the standalone detail view). Re-selecting a template
 * swaps the record in place. The old read-only preview is gone.
 */
export function TemplateSyncPageClient({
  backHref,
  initialSelections,
  initialTemplate,
}: {
  backHref: string
  initialSelections?: TemplateSyncInitialSelections
  initialTemplate?: TemplateDetail | null
}) {
  const controller = useTemplateSyncController({ initialSelections, initialTemplate })

  return (
    <RecordDetailClientScaffold title="Template sync" backHref={backHref} dirtyMessage="">
      {(page) => <TemplateSyncView page={page} controller={controller} />}
    </RecordDetailClientScaffold>
  )
}

const PROMPT_CARD_CLASS =
  "rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-10 text-center text-sm text-[var(--foreground)]/65"

function TemplateSyncView({
  page,
  controller,
}: {
  page: RecordDetailClientScaffoldContext
  controller: TemplateSyncController
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
    openTemplate,
  } = controller

  // Selecting a different template (or clearing the cascade) discards the
  // currently loaded record. The in-place swap is not a router navigation, so
  // the scaffold's leave-guard doesn't fire — gate it here when the record is
  // dirty by deferring the action behind a confirm dialog.
  const isRecordDirty = page.isDirty
  const [pendingAction, setPendingAction] = useState<{ run: () => void } | null>(null)

  const guard = useCallback(
    (action: () => void) => {
      if (isRecordDirty) {
        setPendingAction({ run: action })
      } else {
        action()
      }
    },
    [isRecordDirty],
  )

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
        onOpenTemplate={openTemplate}
        actions={
          <>
            <HubSidePanelAddButton label="+ Template" onClick={newTemplate} />
            <SidePanelPreviewClearButton
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

      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved changes?"
        message="This template has unsaved changes. Switching templates will discard them."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={() => {
          pendingAction?.run()
          setPendingAction(null)
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  )
}
