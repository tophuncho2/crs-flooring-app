"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { TemplateListRow } from "@builders/domain"
import { DataTable } from "@/engines/list-view"
import { ChoiceDialog, RecordItemSection, useRecordCreateChoice } from "@/engines/record-view"
import {
  buildCurrentRecordEntryPath,
  buildTemplateHubHref,
} from "@/hooks/navigation/routes"
import { TemplateQuickCreateModal } from "@/modules/templates/components/record/template-quick-create-modal"
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

  const choice = useRecordCreateChoice()
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  // "+ Template" opens the quick-create modal with the property picker scoped to
  // THIS entity's properties. On create, the choice dialog offers "Go to
  // {template}" or stay in this entity.
  const openTemplateCreate = () => setTemplateModalOpen(true)

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
      {templateModalOpen ? (
        <TemplateQuickCreateModal
          open
          entityScope={{ id: entity.id, label: entity.entity }}
          onClose={() => setTemplateModalOpen(false)}
          onCreated={(option) => {
            setTemplateModalOpen(false)
            choice.present({
              destinations: [
                {
                  label: `Go to ${option.unitType}`,
                  href: buildTemplateHubHref({
                    templateId: option.id,
                    templateLabel: option.unitType,
                    entityId: entity.id,
                    entityLabel: entity.entity,
                    returnTo,
                  }),
                },
              ],
              stay: { label: "Stay here" },
            })
          }}
        />
      ) : null}
      {choice.choiceDialogProps ? <ChoiceDialog {...choice.choiceDialogProps} /> : null}
    </RecordItemSection>
  )
}
