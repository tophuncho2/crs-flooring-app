"use client"

import type { ReactNode } from "react"
import {
  RecordItemCell,
  RecordRowLayout,
  RecordRowOpenButton,
  RecordSectionItem,
  RecordSectionShell,
  TextCell,
  type RecordRowColumnSpec,
} from "@/features/shared/engines/record-view"
import type { PropertyTemplateRow } from "../../../domain/types"

const TEMPLATE_COLUMNS: RecordRowColumnSpec[] = [
  { key: "template", minWidth: 220, grow: 2 },
  { key: "warehouse", minWidth: 220, grow: 2 },
  { key: "items", minWidth: 120, grow: 1, align: "center" },
  { key: "open", minWidth: 108, grow: 0, align: "center" },
]

export function PropertyTemplatesSection({
  actionPanel,
  templates,
  loadingTemplateId,
  onOpenTemplate,
}: {
  actionPanel?: ReactNode
  templates: PropertyTemplateRow[]
  loadingTemplateId: string | null
  onOpenTemplate: (templateId: string) => void
}) {
  return (
    <RecordSectionShell
      title="Templates"
      bodyClassName="space-y-4"
      statusPanel={actionPanel}
      metrics={[{ label: "Templates", value: String(templates.length) }]}
    >
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No templates linked to this property yet.
        </div>
      ) : null}

      {templates.map((template) => (
        <RecordSectionItem key={template.id}>
          <RecordRowLayout columns={TEMPLATE_COLUMNS}>
            <RecordItemCell label="Template" columnKey="template">
              <TextCell className="font-medium">{template.templateTag}</TextCell>
            </RecordItemCell>
            <RecordItemCell label="Warehouse" columnKey="warehouse">
              <TextCell>{template.warehouseName || "No warehouse"}</TextCell>
            </RecordItemCell>
            <RecordItemCell label="Rows" columnKey="items">
              <TextCell align="center">{template.itemsCount}</TextCell>
            </RecordItemCell>
            <RecordItemCell label="Open" columnKey="open">
              <div className="flex min-h-[2.5rem] items-center justify-center">
                <RecordRowOpenButton
                  onOpen={() => onOpenTemplate(template.id)}
                  loading={loadingTemplateId === template.id}
                />
              </div>
            </RecordItemCell>
          </RecordRowLayout>
        </RecordSectionItem>
      ))}
    </RecordSectionShell>
  )
}
