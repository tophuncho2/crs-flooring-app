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
import { TEMPLATES_LIST_COLUMNS } from "@/modules/templates/components/list/table/templates-list-columns"
import { renderTemplateRowCell } from "@/modules/templates/components/list/table/templates-row-cell"
import { useTemplatesSectionTable } from "@/modules/templates/controllers/record/use-templates-section-table"
import { useTemplatesSectionScope } from "@/modules/templates/controllers/record/use-templates-section-scope"

/**
 * The Entity record view's §3 templates section, on the canonical
 * `RecordItemSection` chrome (persistent blue header). The body is a paginated
 * list-view `DataTable` over the shared templates columns, scoped (via
 * `useTemplatesSectionScope`) to the seeded entity — listing all of its templates.
 * "+ Template" opens a fresh create form; clicking a row routes to that template's
 * hub.
 *
 * Shares its scope + table controllers (`useTemplatesSectionScope` /
 * `useTemplatesSectionTable`) with the property record view's templates section.
 */
export function EntityTemplatesSection({
  entity,
}: {
  entity: { id: string; entity: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { cascade } = useTemplatesSectionScope({
    entityId: entity.id,
    entityLabel: entity.entity,
  })

  const grid = useTemplatesSectionTable({
    entityId: cascade.entityId,
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
        entityId: row.entityId,
        entityLabel: row.entityName,
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
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No templates for this entity yet."}
        pagination={grid.pagination}
      />
    </RecordItemSection>
  )
}
