"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { TemplateListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { RecordItemSection } from "@/engines/record-view"
import {
  buildCurrentRecordEntryPath,
  buildRecordCreateHref,
  buildTemplateHubHref,
} from "@/hooks/navigation/routes"
import { ManagementCompanyPicker } from "@/modules/management-companies/components/picker/management-company-picker"
import { PropertyPicker } from "@/modules/properties/components/picker/property-picker"
import { TEMPLATES_LIST_COLUMNS } from "@/modules/templates/components/list/table/templates-list-columns"
import { renderTemplateRowCell } from "@/modules/templates/components/list/table/templates-row-cell"
import { useTemplatesSectionTable } from "@/modules/templates/controllers/record/use-templates-section-table"
import { useTemplatesSectionScope } from "@/modules/templates/controllers/record/use-templates-section-scope"

/**
 * The Management Company record view's §3 templates section, on the canonical
 * `RecordItemSection` chrome (persistent blue header). The MC + Property scope
 * pickers ride in the section sub-header beside "+ Template" / "Clear"; the body
 * is a paginated list-view `DataTable` over the shared templates columns. The MC
 * is seeded + **locked** while the Property picker stays selectable, filtering the
 * list to a property within the company. Clear resets that property filter.
 * Clicking a row routes to that template's hub.
 *
 * Shares its scope + table controllers (`useTemplatesSectionScope` /
 * `useTemplatesSectionTable`) with the property record view's templates section.
 */
export function ManagementCompanyTemplatesSection({
  managementCompany,
}: {
  managementCompany: { id: string; name: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { cascade } = useTemplatesSectionScope({
    managementCompanyId: managementCompany.id,
    managementCompanyLabel: managementCompany.name,
  })

  const grid = useTemplatesSectionTable({
    managementCompanyId: cascade.managementCompanyId,
    propertyId: cascade.propertyId,
    enabled: true,
  })

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  // Clear resets only the Property filter; the seeded company is always kept.
  const clearPropertyFilter = () => {
    cascade.seed({ property: null })
    grid.reset()
  }

  // "+ Template" opens a fresh template create form — no scope seeding.
  const openTemplateCreate = () => {
    router.push(buildRecordCreateHref("/dashboard/templates", { returnTo }))
  }

  const openTemplate = (row: TemplateListRow) => {
    router.push(
      buildTemplateHubHref({
        templateId: row.id,
        templateLabel: row.unitType,
        propertyId: row.propertyId,
        propertyLabel: row.propertyName,
        managementCompanyId: row.managementCompanyId,
        managementCompanyLabel: row.managementCompanyName,
        returnTo,
      }),
    )
  }

  return (
    <RecordItemSection
      title="Templates"
      subHeader={{
        canManage: false,
        showStatus: false,
        isDirty: false,
        isSaving: false,
        hasConflict: false,
        actionsLeading: (
          // Scope pickers: management company (locked to the seed) + property
          // (selectable, filtered to the company). Both narrow the list below.
          <div className="flex flex-wrap items-center gap-2">
            <ManagementCompanyPicker
              value={cascade.managementCompanyId}
              selectedLabel={cascade.managementCompanyLabel}
              onChange={() => {}}
              onOptionSelected={() => {}}
              disabled
              placeholder="Select company"
              ariaLabel="Select management company"
            />
            <PropertyPicker
              value={cascade.propertyId}
              selectedLabel={cascade.propertyLabel}
              managementCompanyId={cascade.managementCompanyId}
              onChange={() => {}}
              onOptionSelected={(option) => cascade.selectProperty(option)}
              placeholder="Select property"
              ariaLabel="Select property"
            />
          </div>
        ),
        actions: [
          {
            key: "add-template",
            label: "+ Template",
            tone: "primary",
            onClick: openTemplateCreate,
          },
          {
            key: "clear-filter",
            label: "Clear",
            tone: "neutral",
            onClick: clearPropertyFilter,
            disabled: cascade.propertyId === null,
          },
        ],
      }}
    >
      <DataTable<TemplateListRow>
        rows={grid.rows}
        columns={TEMPLATES_LIST_COLUMNS}
        renderCell={renderTemplateRowCell}
        onOpenRow={(row) => openTemplate(row)}
        getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No templates match these filters."}
        pagination={grid.pagination}
      />
    </RecordItemSection>
  )
}
