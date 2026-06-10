"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  RecordReferenceHeader,
  ReferenceHeaderClearButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { TemplateRecordHeader } from "@/modules/templates/components/record/header/template-record-header"
import { TemplatePreviewPanel } from "./template-preview-panel"
import { useTemplateOptionsGrid } from "@/modules/templates/controllers/record/header/use-template-options-grid"
import { toTemplateOption } from "@/modules/templates/controllers/record/use-template-hub-controller"
import { useMcTemplateReferenceController } from "@/modules/management-companies/controllers/record/templates/use-mc-template-reference-controller"
import { buildCurrentRecordEntryPath, buildTemplateHubHref } from "@/hooks/navigation/routes"

const PROMPT_CARD_CLASS =
  "rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-10 text-center text-sm text-[var(--foreground)]/65"

/**
 * The MC record view's third section: the same shared reference header the
 * templates hub uses (Property scope picker over a paginated templates table),
 * scoped to this management company. The MC picker is hidden — we're already
 * inside the company — so the operator only picks a Property (to filter) and a
 * Template. Selecting a template reveals a read-only preview of its details +
 * material items beneath, with an "Open template" hand-off to the editable hub.
 *
 * Read-only by design (editing is a future pass), so the reference header's
 * dirty discard-guard is intentionally bypassed: switching the previewed
 * template loses nothing, and the host `page.isDirty` reflects the *MC* form,
 * not this section.
 */
export function TemplateReferenceSection({
  page,
  managementCompanyId,
  managementCompanyLabel,
}: {
  page: RecordDetailClientScaffoldContext
  managementCompanyId: string
  managementCompanyLabel: string | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { cascade, templateDetail, isTemplateLoading, templateError, clear } =
    useMcTemplateReferenceController({ managementCompanyId, managementCompanyLabel })

  // The picker grid shows while browsing; once a template is selected it
  // collapses to its list row and the read-only preview takes the space.
  // `isPicking` is the explicit "re-open to re-select" toggle.
  const [isPicking, setIsPicking] = useState(false)
  const expanded = isPicking || cascade.templateId === null

  const grid = useTemplateOptionsGrid({
    managementCompanyId: cascade.managementCompanyId,
    propertyId: cascade.propertyId,
    enabled: expanded,
  })

  const beginReselect = () => setIsPicking(true)

  const openInHub = () => {
    if (!templateDetail) return
    router.push(
      buildTemplateHubHref({
        templateId: templateDetail.id,
        templateLabel: templateDetail.unitType,
        propertyId: templateDetail.propertyId,
        propertyLabel: templateDetail.propertyName,
        managementCompanyId: templateDetail.managementCompanyId,
        managementCompanyLabel: templateDetail.managementCompanyName,
        returnTo: buildCurrentRecordEntryPath(pathname, searchParams),
      }),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <RecordReferenceHeader
        page={page}
        label="Template"
        actions={() => (
          <>
            {!expanded ? (
              <button
                type="button"
                onClick={beginReselect}
                className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
              >
                Re-select
              </button>
            ) : null}
            <ReferenceHeaderClearButton
              disabled={cascade.propertyId === null && cascade.templateId === null}
              onClick={() => {
                clear()
                grid.reset()
                setIsPicking(false)
              }}
            />
          </>
        )}
      >
        {() => (
          <TemplateRecordHeader
            cascade={cascade}
            grid={grid}
            templateDetail={templateDetail}
            expanded={expanded}
            hideManagementCompanyPicker
            onReselect={beginReselect}
            onSelectManagementCompany={() => {}}
            onSelectProperty={(option) => cascade.selectProperty(option)}
            onSelectTemplate={(row) => {
              cascade.selectTemplate(toTemplateOption(row))
              setIsPicking(false)
            }}
          />
        )}
      </RecordReferenceHeader>

      {/* Kept mounted while the picker is open so the read-only preview's loaded
          record isn't refetched on every collapse/expand. */}
      <div className={expanded ? "hidden" : undefined}>
        {templateError ? (
          <div className={PROMPT_CARD_CLASS}>{templateError}</div>
        ) : isTemplateLoading ? (
          <div className={PROMPT_CARD_CLASS}>Loading template…</div>
        ) : templateDetail ? (
          <TemplatePreviewPanel template={templateDetail} onOpen={openInHub} />
        ) : (
          <div className={PROMPT_CARD_CLASS}>Select a template to preview it.</div>
        )}
      </div>
    </div>
  )
}
