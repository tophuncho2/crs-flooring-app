"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { PropertyManagementCompany, TemplateListRow } from "@builders/domain"
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
import {
  TEMPLATE_SECTION_PAGE_SIZE,
  useTemplatesSectionTable,
} from "@/modules/templates/controllers/record/use-templates-section-table"
import { useTemplatesSectionScope } from "@/modules/templates/controllers/record/use-templates-section-scope"

/**
 * The Property record view's §2 templates section, on the canonical
 * `RecordItemSection` chrome (persistent blue header). The MC + Property scope
 * pickers ride in the section sub-header beside "+ Template"; the body is a
 * paginated list-view `DataTable` over the shared templates columns. The property
 * is seeded + **locked**, and the management company is seeded + locked when the
 * property has one (empty for an orphan). Both pickers are read-only here — the
 * operator only browses the property's templates and clicks a row to open that
 * template's hub.
 */
export function PropertyTemplatesSection({
  managementCompany,
  property,
}: {
  managementCompany: PropertyManagementCompany | null
  property: { id: string; name: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { cascade } = useTemplatesSectionScope({
    managementCompanyId: managementCompany?.id ?? null,
    managementCompanyLabel: managementCompany?.name ?? null,
    propertyId: property.id,
    propertyLabel: property.name,
  })

  const grid = useTemplatesSectionTable({
    managementCompanyId: cascade.managementCompanyId,
    propertyId: cascade.propertyId,
    enabled: true,
  })

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

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
          // Scope pickers: both locked to the seeded property (and its company,
          // when present). They show the fixed scope; the list can't be re-scoped.
          <div className="flex flex-wrap items-center gap-2">
            <ManagementCompanyPicker
              value={cascade.managementCompanyId}
              selectedLabel={cascade.managementCompanyLabel}
              onChange={() => {}}
              onOptionSelected={() => {}}
              disabled
              placeholder="No company"
              ariaLabel="Management company"
            />
            <PropertyPicker
              value={cascade.propertyId}
              selectedLabel={cascade.propertyLabel}
              managementCompanyId={cascade.managementCompanyId}
              onChange={() => {}}
              onOptionSelected={() => {}}
              disabled
              placeholder="Select property"
              ariaLabel="Property"
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
        ],
      }}
    >
      <DataTable<TemplateListRow>
        rows={grid.rows}
        columns={TEMPLATES_LIST_COLUMNS}
        renderCell={renderTemplateRowCell}
        onOpenRow={(row) => openTemplate(row)}
        getRowAriaLabel={(row) => `Open template ${row.templateNumber}`}
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No templates for this property yet."}
        pagination={{
          page: grid.page,
          pageSize: TEMPLATE_SECTION_PAGE_SIZE,
          totalItems: grid.total,
          totalPages: grid.totalPages,
          hasPreviousPage: grid.hasPrevious,
          hasNextPage: grid.hasNext,
          onPreviousPage: grid.goToPrevious,
          onNextPage: grid.goToNext,
        }}
      />
    </RecordItemSection>
  )
}
