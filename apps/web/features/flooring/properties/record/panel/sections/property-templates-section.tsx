"use client"

import type { ReactNode } from "react"
import {
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemCell,
  RecordRowLayout,
  RecordRowOpenButton,
  RecordSectionItem,
  RecordSectionShell,
  RecordSectionStatusBadge,
  TextCell,
  type RecordRowColumnSpec,
} from "@/features/shared/engines/record-view"
import type { PropertyTemplateDraft, PropertyTemplateRow } from "../../../domain/types"

const TEMPLATE_COLUMNS: RecordRowColumnSpec[] = [
  { key: "template", minWidth: 220, grow: 2 },
  { key: "warehouse", minWidth: 220, grow: 2 },
  { key: "items", minWidth: 120, grow: 1, align: "center" },
  { key: "open", minWidth: 108, grow: 0, align: "center" },
]

export function PropertyTemplatesSection({
  actionPanel,
  templates,
  draft,
  warehouseOptions,
  loadingTemplateId,
  noticeMessage,
  noticeError,
  onDraftChange,
  onOpenTemplate,
}: {
  actionPanel?: ReactNode
  templates: PropertyTemplateRow[]
  draft: PropertyTemplateDraft | null
  warehouseOptions: Array<{ id: string; name: string }>
  loadingTemplateId: string | null
  noticeMessage?: string
  noticeError?: string
  onDraftChange: (field: keyof Omit<PropertyTemplateDraft, "id">, value: string) => void
  onOpenTemplate: (templateId: string) => void
}) {
  return (
    <RecordSectionShell
      title="Templates"
      bodyClassName="space-y-4"
      statusPanel={actionPanel}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={[{ label: "Templates", value: String(templates.length) }]}
    >
      {draft ? (
        <RecordSectionItem status={<RecordSectionStatusBadge tone="warning">Draft</RecordSectionStatusBadge>}>
          <RecordRowLayout columns={TEMPLATE_COLUMNS}>
            <RecordItemCell label="Template" columnKey="template">
              <RecordGridCellInput
                aria-label="Template Tag"
                value={draft.templateTag}
                placeholder="Template Tag"
                controlSize="compact"
                onChange={(event) => onDraftChange("templateTag", event.target.value)}
              />
            </RecordItemCell>
            <RecordItemCell label="Warehouse" columnKey="warehouse">
              <RecordGridCellSelect
                aria-label="Warehouse"
                value={draft.warehouseId}
                controlSize="compact"
                onChange={(event) => onDraftChange("warehouseId", event.target.value)}
              >
                <option value="">No warehouse</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </RecordGridCellSelect>
            </RecordItemCell>
            <RecordItemCell label="Rows" columnKey="items">
              <TextCell align="center">New</TextCell>
            </RecordItemCell>
            <RecordItemCell label="Open" columnKey="open">
              <TextCell align="center">Save first</TextCell>
            </RecordItemCell>
          </RecordRowLayout>
        </RecordSectionItem>
      ) : null}

      {templates.length === 0 && !draft ? (
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
