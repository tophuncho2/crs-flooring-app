"use client"

import {
  RecordItemCell,
  RecordItemSection,
  RecordItemSectionControls,
  RecordRowLayout,
  RecordSectionGrid,
  RecordSectionGridRow,
  TextCell,
  type RecordSectionSubHeaderProps,
  type RecordRowColumnSpec,
} from "@/modules/shared/engines/record-view"
import type { PropertyTemplateRow } from "../../../domain/types"

const TEMPLATE_COLUMNS: RecordRowColumnSpec[] = [
  { key: "template", minWidth: 220, grow: 2, label: "Template" },
  { key: "warehouse", minWidth: 220, grow: 2, label: "Warehouse" },
  { key: "items", minWidth: 120, grow: 1, align: "center", label: "Rows" },
  { key: "open", minWidth: 108, grow: 0, align: "center", label: "Open" },
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
      bodyClassName="space-y-0"
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
      emptyState="No templates linked to this property yet."
    >
      <RecordSectionGrid
        columns={TEMPLATE_COLUMNS}
        isEmpty={templates.length === 0}
        emptyState="No templates linked to this property yet."
      >
        {templates.map((template, index) => (
          <RecordSectionGridRow
            key={template.id}
            columns={TEMPLATE_COLUMNS}
          >
            <RecordRowLayout columns={TEMPLATE_COLUMNS}>
              <RecordItemCell columnKey="template" chrome="grid" showLabel={index === 0}>
                <TextCell className="font-medium">{template.templateTag}</TextCell>
              </RecordItemCell>
              <RecordItemCell columnKey="warehouse" chrome="grid" showLabel={index === 0}>
                <TextCell>{template.warehouseName || "No warehouse"}</TextCell>
              </RecordItemCell>
              <RecordItemCell columnKey="items" chrome="grid" showLabel={index === 0}>
                <TextCell align="center">{template.itemsCount}</TextCell>
              </RecordItemCell>
              <RecordItemSectionControls
                capabilities={{ supportsOpenRow: true }}
                cellChrome="grid"
                showCellLabels={index === 0}
                open={{
                  onOpen: () => onOpenTemplate(template.id),
                  loading: loadingTemplateId === template.id,
                }}
              />
            </RecordRowLayout>
          </RecordSectionGridRow>
        ))}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
