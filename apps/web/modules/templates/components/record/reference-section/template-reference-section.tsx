"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  RecordReferenceHeader,
  ReferenceHeaderAddButton,
  ReferenceHeaderClearButton,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  buildCurrentRecordEntryPath,
  buildRecordCreateHref,
  buildTemplateHubHref,
} from "@/hooks/navigation/routes"
import { TemplateOptionsGrid } from "@/modules/templates/components/record/header/template-options-grid"
import { useTemplateOptionsGrid } from "@/modules/templates/controllers/record/header/use-template-options-grid"
import { useTemplateReferenceSection } from "@/modules/templates/controllers/record/use-template-reference-section"

export type TemplateReferenceScopeSeed = {
  id: string
  label: string | null
}

/**
 * The shared templates reference section, owned by `modules/templates` and
 * consumed by both the MC record view and the property record view. Wraps the
 * shared `RecordReferenceHeader` chrome (from `@/engines/record-view`) around the
 * cascade picker grid (MC + Property pickers over a paginated templates table).
 * Clicking a template row routes straight to that template's hub record view —
 * there is no read-only preview here.
 *
 * Hosts configure it with an optional seeded management company and an optional
 * seeded property, plus per-picker selectability:
 *   - MC record view: `managementCompany` seeded + locked, `propertySelectable`
 *     (property filtered to the company); Clear resets that property filter.
 *   - Property record view: `property` seeded + locked, and `managementCompany`
 *     seeded + locked when the property has one (null for an orphan property);
 *     the operator only browses + opens templates.
 */
export function TemplateReferenceSection({
  page,
  managementCompany = null,
  property = null,
  managementCompanySelectable = false,
  propertySelectable = false,
}: {
  page: RecordDetailClientScaffoldContext
  managementCompany?: TemplateReferenceScopeSeed | null
  property?: TemplateReferenceScopeSeed | null
  /** Allow re-selecting the management company (default: locked to the seed). */
  managementCompanySelectable?: boolean
  /** Allow re-selecting the property (default: locked to the seed). */
  propertySelectable?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { cascade } = useTemplateReferenceSection({
    managementCompanyId: managementCompany?.id ?? null,
    managementCompanyLabel: managementCompany?.label ?? null,
    propertyId: property?.id ?? null,
    propertyLabel: property?.label ?? null,
  })

  const grid = useTemplateOptionsGrid({
    managementCompanyId: cascade.managementCompanyId,
    propertyId: cascade.propertyId,
    enabled: true,
  })

  // Clear only resets the Property filter, and only where the property is
  // user-selectable (MC view). The seeded management company is always kept;
  // `seed` applies with no cascade side-effects.
  const clearPropertyFilter = () => {
    cascade.seed({ property: null })
    grid.reset()
  }

  // "+ Template" just opens a fresh template create form — no scope seeding.
  const openTemplateCreate = () => {
    router.push(
      buildRecordCreateHref("/dashboard/templates", {
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
          <div className="flex items-center gap-2">
            <ReferenceHeaderAddButton label="+ Template" onClick={openTemplateCreate} />
            {propertySelectable ? (
              <ReferenceHeaderClearButton
                disabled={cascade.propertyId === null}
                onClick={clearPropertyFilter}
              />
            ) : null}
          </div>
        )}
      >
        {() => (
          <TemplateOptionsGrid
            cascade={cascade}
            grid={grid}
            managementCompanyPickerDisabled={!managementCompanySelectable}
            propertyPickerDisabled={!propertySelectable}
            onSelectManagementCompany={(option) =>
              managementCompanySelectable ? cascade.selectManagementCompany(option) : undefined
            }
            onSelectProperty={(option) =>
              propertySelectable ? cascade.selectProperty(option) : undefined
            }
            onOpenTemplate={(row) =>
              router.push(
                buildTemplateHubHref({
                  templateId: row.id,
                  templateLabel: row.unitType,
                  propertyId: row.propertyId,
                  propertyLabel: row.propertyName,
                  managementCompanyId: row.managementCompanyId,
                  managementCompanyLabel: row.managementCompanyName,
                  returnTo: buildCurrentRecordEntryPath(pathname, searchParams),
                }),
              )
            }
          />
        )}
      </RecordReferenceHeader>
    </div>
  )
}
