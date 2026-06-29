"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import type { PropertyEntity, TemplateListRow } from "@builders/domain"
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
 * The Property record view's §2 templates section, on the canonical
 * `RecordItemSection` chrome (persistent blue header). The body is a paginated
 * list-view `DataTable` over the shared templates columns, scoped (via
 * `useTemplatesSectionScope`) to the seeded property — and its entity,
 * when it has one. The operator only browses the property's templates and clicks a
 * row to open that template's hub; "+ Template" opens a fresh create form.
 */
export function PropertyTemplatesSection({
  entity,
  property,
}: {
  entity: PropertyEntity | null
  property: { id: string; name: string }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const { cascade } = useTemplatesSectionScope({
    entityId: entity?.id ?? null,
    entityLabel: entity?.entity ?? null,
    propertyId: property.id,
    propertyLabel: property.name,
  })

  const grid = useTemplatesSectionTable({
    entityId: cascade.entityId,
    propertyId: cascade.propertyId,
    enabled: true,
  })

  const choice = useRecordCreateChoice()
  const [templateModalOpen, setTemplateModalOpen] = useState(false)

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  // "+ Template" opens the quick-create modal with THIS property seeded + locked.
  // On create, the choice dialog offers "Go to {template}" or stay in this property.
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
        empty={grid.isLoading ? "Searching…" : grid.error ?? "No templates for this property yet."}
        pagination={grid.pagination}
      />
      {/* Portal the modal + choice dialog to <body>: mounted inline they sit in
          the record section's stacking context and the app shell paints over
          them. The shared RecordModal is left untouched (sacred adjustment
          modals depend on it). */}
      {typeof document !== "undefined" && (templateModalOpen || choice.choiceDialogProps)
        ? createPortal(
            <>
              {templateModalOpen ? (
                <TemplateQuickCreateModal
                  open
                  initialProperty={{ id: property.id, label: property.name }}
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
                            propertyId: property.id,
                            propertyLabel: property.name,
                            entityId: entity?.id ?? null,
                            entityLabel: entity?.entity ?? null,
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
            </>,
            document.body,
          )
        : null}
    </RecordItemSection>
  )
}
