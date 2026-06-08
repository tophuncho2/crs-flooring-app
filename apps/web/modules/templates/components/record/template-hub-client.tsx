"use client"

import { useState } from "react"
import {
  RecordDetailClientScaffold,
  RecordReferenceHeader,
  ReferenceHeaderClearButton,
  ReferenceHeaderDiscardButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { PickerAddButton, type CascadePickerSeed } from "@/engines/picker"
import type { TemplateDetail } from "@builders/domain"
import { TemplateRecordPanel } from "./template-record-panel"
import { TemplateRecordHeader } from "./header/template-record-header"
import { useTemplateOptionsGrid } from "@/modules/templates/controllers/record/header/use-template-options-grid"
import {
  toTemplateOption,
  useTemplateHubController,
  type TemplateHubController,
  type TemplateHubInitialSelections,
} from "@/modules/templates/controllers/record/use-template-hub-controller"

/**
 * The single templates page ("template hub"). The top section is the reference
 * header: the Management Company + Property scope pickers over a paginated
 * templates table — clicking a row selects that template and loads the *editable*
 * record below (its primary + material-items sections). Re-selecting swaps the
 * record in place; collapsed it shows the selected template as the same list row.
 * Opened from every template entry point (list / MC / work-order / create) with
 * the template pre-selected, or from the app-shell icon in the empty state.
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
  const { cascade, templateDetail, isTemplateLoading, templateError, clear, newTemplate } =
    controller

  // The picker grid shows while browsing; once a template is selected it collapses
  // to its list row so the record sections own the space. With nothing selected
  // the grid stays open so there's always a way to pick. `isPicking` is the
  // explicit "re-open to re-select" toggle (Re-select button / clicking the row).
  const [isPicking, setIsPicking] = useState(false)
  const expanded = isPicking || cascade.templateId === null

  // The picker grid controller is owned here (not inside the grid component) so
  // the reference header's Clear can reset its page. It only fetches while the
  // picker is open (`enabled`).
  const grid = useTemplateOptionsGrid({
    managementCompanyId: cascade.managementCompanyId,
    propertyId: cascade.propertyId,
    enabled: expanded,
  })

  // Snapshot of the cascade selection captured when re-picking begins, so
  // "Discard" can restore the template the operator started from (changing
  // MC/property mid-pick cascade-clears the template, so we can't recover it
  // otherwise). Restored via `cascade.seed` (no downstream clear).
  const [reselectSnapshot, setReselectSnapshot] = useState<CascadePickerSeed | null>(null)
  const beginReselect = () => {
    setReselectSnapshot({
      managementCompany: cascade.managementCompanyId
        ? { id: cascade.managementCompanyId, label: cascade.managementCompanyLabel }
        : null,
      property: cascade.propertyId
        ? { id: cascade.propertyId, label: cascade.propertyLabel }
        : null,
      template: cascade.templateId
        ? { id: cascade.templateId, label: cascade.templateLabel }
        : null,
    })
    setIsPicking(true)
  }

  // The reference-header primitive owns the discard-guard: selecting a different
  // template (or clearing the header) while the record is dirty prompts a confirm
  // before swapping. The swap isn't a router navigation, so this is separate from
  // the scaffold's leave-guard.
  return (
    <div className="flex flex-col gap-4">
      <RecordReferenceHeader
        page={page}
        label="Template"
        discardMessage="This template has unsaved changes. Switching templates will discard them."
        actions={({ guard }) => (
          <>
            <PickerAddButton label="+ Template" onClick={newTemplate} />
            {!expanded ? (
              <button
                type="button"
                onClick={beginReselect}
                className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
              >
                Re-select
              </button>
            ) : null}
            {/* Discard cancels an in-progress re-pick, restoring the template the
                operator started from. Not guarded: committing a different template
                already collapses the picker, so this only ever restores the
                snapshot's own (possibly dirty, preserved) record. */}
            {expanded && reselectSnapshot ? (
              <ReferenceHeaderDiscardButton
                disabled={false}
                onClick={() => {
                  cascade.seed(reselectSnapshot)
                  setReselectSnapshot(null)
                  setIsPicking(false)
                }}
              />
            ) : null}
            <ReferenceHeaderClearButton
              disabled={!cascade.hasSelections}
              onClick={() =>
                guard(() => {
                  clear()
                  grid.reset()
                  setReselectSnapshot(null)
                  setIsPicking(false)
                })
              }
            />
          </>
        )}
      >
        {({ guard }) => (
          <TemplateRecordHeader
            cascade={cascade}
            grid={grid}
            templateDetail={templateDetail}
            expanded={expanded}
            onReselect={beginReselect}
            onSelectManagementCompany={(option) =>
              guard(() => cascade.selectManagementCompany(option))
            }
            onSelectProperty={(option) => guard(() => cascade.selectProperty(option))}
            onSelectTemplate={(row) =>
              guard(() => {
                cascade.selectTemplate(toTemplateOption(row))
                setReselectSnapshot(null)
                setIsPicking(false)
              })
            }
          />
        )}
      </RecordReferenceHeader>

      {/* Kept mounted while a picker is browsed so unsaved record edits survive. */}
      <div className={expanded ? "hidden" : undefined}>
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
