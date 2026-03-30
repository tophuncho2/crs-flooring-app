"use client"

import type { ReactNode } from "react"
import {
  RecordItemSection,
  RecordItemSectionControls,
  RecordItemCell,
  RecordRowLayout,
  RecordSectionItem,
  TextCell,
  type RecordSectionSubHeaderProps,
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
  subHeader,
  templates,
  loadingTemplateId,
  onOpenTemplate,
}: {
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  templates: PropertyTemplateRow[]
  loadingTemplateId: string | null
  onOpenTemplate: (templateId: string) => void
}) {
  return (
    <RecordItemSection
      title="Templates"
      bodyClassName="space-y-4"
      subHeader={subHeader}
      metrics={[{ label: "Templates", value: String(templates.length) }]}
      capabilities={{
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: true,
        supportsOpenRow: true,
        supportsRouteAdd: true,
      }}
      isEmpty={templates.length === 0}
      emptyState={(
        <div className="rounded-2xl border border-dashed border-[var(--panel-border)] px-4 py-8 text-center text-[var(--foreground)]/65">
          No templates linked to this property yet.
        </div>
      )}
    >

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
            <RecordItemSectionControls
              capabilities={{ supportsOpenRow: true }}
              open={{
                onOpen: () => onOpenTemplate(template.id),
                loading: loadingTemplateId === template.id,
              }}
            />
          </RecordRowLayout>
        </RecordSectionItem>
      ))}
    </RecordItemSection>
  )
}
