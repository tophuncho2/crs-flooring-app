"use client"

import type { Dispatch, ReactNode, SetStateAction } from "react"
import {
  AutoGrowTextarea,
  RecordFormField,
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordSectionShell,
  joinRecordSectionClasses,
  RECORD_SECTION_BODY_SURFACE_CLASS_NAME,
} from "@/features/shared/engines/record-view"
import type { DraftTemplate, PropertyOption, WarehouseOption } from "@/features/flooring/templates/types"

export function TemplatePrimaryFieldsSection({
  draft,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  setDraft,
  actionPanel,
  showHeader = true,
}: {
  draft: DraftTemplate
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: Array<{ id: string; label: string }>
  setDraft: Dispatch<SetStateAction<DraftTemplate>>
  actionPanel?: ReactNode
  showHeader?: boolean
}) {
  const content = (
    <RecordPrimarySection>
        <RecordPrimaryPane variant="side">
          <RecordPrimaryFieldsGrid variant="side">
            <RecordPrimaryFieldCell>
              <RecordFormField label="Warehouse">
                <select
                  value={draft.warehouseId}
                  onChange={(event) => setDraft((previous) => ({ ...previous, warehouseId: event.target.value }))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">No warehouse</option>
                  {warehouseOptions.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.name}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell>
              <RecordFormField label="Pad Type">
                <select
                  value={draft.padProductId}
                  onChange={(event) => setDraft((previous) => ({ ...previous, padProductId: event.target.value }))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">No pad type</option>
                  {padProductOptions.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.label}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
          </RecordPrimaryFieldsGrid>
        </RecordPrimaryPane>

        <RecordPrimaryPane variant="main">
          <RecordPrimaryFieldsGrid>
            <RecordPrimaryFieldCell size="md">
              <RecordFormField label="Property">
                <select
                  value={draft.propertyId}
                  onChange={(event) => setDraft((previous) => ({ ...previous, propertyId: event.target.value }))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                >
                  <option value="">Select property</option>
                  {propertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="sm">
              <RecordFormField label="Template Tag">
                <input
                  value={draft.templateTag}
                  onChange={(event) => setDraft((previous) => ({ ...previous, templateTag: event.target.value }))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="lg">
              <RecordFormField label="Instructions">
                <AutoGrowTextarea
                  value={draft.instructions}
                  onChange={(event) => setDraft((previous) => ({ ...previous, instructions: event.target.value }))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
            <RecordPrimaryFieldCell size="lg">
              <RecordFormField label="Template Notes">
                <AutoGrowTextarea
                  value={draft.templateNotes}
                  onChange={(event) => setDraft((previous) => ({ ...previous, templateNotes: event.target.value }))}
                  className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
                />
              </RecordFormField>
            </RecordPrimaryFieldCell>
          </RecordPrimaryFieldsGrid>
        </RecordPrimaryPane>
      </RecordPrimarySection>
  )

  if (!showHeader) {
    return (
      <>
        {actionPanel}
        <div className={joinRecordSectionClasses("px-5 py-5 space-y-0", RECORD_SECTION_BODY_SURFACE_CLASS_NAME)}>
          {content}
        </div>
      </>
    )
  }

  return (
    <RecordSectionShell title="Template Details" bodyClassName="space-y-0" statusPanel={actionPanel}>
      {content}
    </RecordSectionShell>
  )
}
