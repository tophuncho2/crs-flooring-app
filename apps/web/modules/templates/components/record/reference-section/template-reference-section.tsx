"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  RecordReferenceHeader,
  ReferenceHeaderClearButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { buildCurrentRecordEntryPath, buildTemplateHubHref } from "@/hooks/navigation/routes"
import { TemplateRecordHeader } from "@/modules/templates/components/record/header/template-record-header"
import { useTemplateOptionsGrid } from "@/modules/templates/controllers/record/header/use-template-options-grid"
import { useTemplateReferenceSection } from "@/modules/templates/controllers/record/use-template-reference-section"
import { toTemplateOption } from "@/modules/templates/controllers/record/use-template-hub-controller"
import { TemplatePreviewPanel } from "./template-preview-panel"

const PROMPT_CARD_CLASS =
  "rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-5 py-10 text-center text-sm text-[var(--foreground)]/65"

export type TemplateReferenceScopeSeed = {
  id: string
  label: string | null
}

/**
 * The shared templates reference section, owned by `modules/templates` and
 * consumed by both the MC record view and the property record view. Wraps the
 * shared `RecordReferenceHeader` chrome (from `@/engines/record-view`) around the
 * cascade picker grid (MC + Property pickers over a paginated templates table);
 * selecting a template reveals a read-only preview of its two sections (Template
 * Details + Material Items) with an "Open template" hand-off to the editable hub.
 *
 * Hosts configure it with a seeded management company (always) and an optional
 * seeded property, plus per-picker selectability:
 *   - MC record view: `managementCompany` seeded + locked, `propertySelectable`
 *     (property filtered to the company).
 *   - Property record view: both `managementCompany` + `property` seeded + locked;
 *     only the template is choosable.
 *
 * Read-only by design (the previewed template is never edited here), so the
 * reference header's dirty discard-guard is intentionally bypassed — switching
 * the previewed template loses nothing, and the host `page.isDirty` reflects the
 * host record's own form, not this section.
 */
export function TemplateReferenceSection({
  page,
  managementCompany,
  property = null,
  managementCompanySelectable = false,
  propertySelectable = false,
}: {
  page: RecordDetailClientScaffoldContext
  managementCompany: TemplateReferenceScopeSeed
  property?: TemplateReferenceScopeSeed | null
  /** Allow re-selecting the management company (default: locked to the seed). */
  managementCompanySelectable?: boolean
  /** Allow re-selecting the property (default: locked to the seed). */
  propertySelectable?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { cascade, templateDetail, isTemplateLoading, templateError } =
    useTemplateReferenceSection({
      managementCompanyId: managementCompany.id,
      managementCompanyLabel: managementCompany.label,
      propertyId: property?.id ?? null,
      propertyLabel: property?.label ?? null,
    })

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

  // Clear resets the template; it also resets the property when the property is
  // user-selectable (MC view), but keeps a locked seed (property view) in place.
  // The seeded management company is always kept. `seed` applies with no cascade
  // side-effects (a full `cascade.reset()` would wipe the locked scope).
  const clear = () => {
    cascade.seed(propertySelectable ? { property: null, template: null } : { template: null })
    grid.reset()
    setIsPicking(false)
  }
  const clearDisabled =
    cascade.templateId === null && (!propertySelectable || cascade.propertyId === null)

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
            <ReferenceHeaderClearButton disabled={clearDisabled} onClick={clear} />
          </>
        )}
      >
        {() => (
          <TemplateRecordHeader
            cascade={cascade}
            grid={grid}
            templateDetail={templateDetail}
            expanded={expanded}
            managementCompanyPickerDisabled={!managementCompanySelectable}
            propertyPickerDisabled={!propertySelectable}
            onReselect={beginReselect}
            onSelectManagementCompany={(option) =>
              managementCompanySelectable ? cascade.selectManagementCompany(option) : undefined
            }
            onSelectProperty={(option) =>
              propertySelectable ? cascade.selectProperty(option) : undefined
            }
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
