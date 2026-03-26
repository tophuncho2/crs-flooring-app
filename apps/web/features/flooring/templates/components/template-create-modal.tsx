"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/features/flooring/shared/accent-styles"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/ui/forms/record-form"
import type { DraftTemplate, PadProductOption, PropertyOption, WarehouseOption } from "../types"

export function TemplateCreateModal({
  draft,
  propertyOptions,
  warehouseOptions,
  padProductOptions,
  message,
  error,
  isSaving,
  onClose,
  onFieldChange,
  onCreate,
}: {
  draft: DraftTemplate
  propertyOptions: PropertyOption[]
  warehouseOptions: WarehouseOption[]
  padProductOptions: PadProductOption[]
  message: string
  error: string
  isSaving: boolean
  onClose: () => void
  onFieldChange: (field: keyof DraftTemplate, value: string) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="New Template" onClose={onClose}>
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RecordFormField label="Template Tag">
            <input
              value={draft.templateTag}
              onChange={(event) => onFieldChange("templateTag", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Property">
            <select
              value={draft.propertyId}
              onChange={(event) => onFieldChange("propertyId", event.target.value)}
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
          <RecordFormField label="Unit Type">
            <input
              value={draft.unitType}
              onChange={(event) => onFieldChange("unitType", event.target.value)}
              className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Warehouse">
            <select
              value={draft.warehouseId}
              onChange={(event) => onFieldChange("warehouseId", event.target.value)}
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
          <RecordFormField label="Pad Type">
            <select
              value={draft.padProductId}
              onChange={(event) => onFieldChange("padProductId", event.target.value)}
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
          <RecordFormField label="Instructions">
            <textarea
              value={draft.instructions}
              onChange={(event) => onFieldChange("instructions", event.target.value)}
              className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2"
            />
          </RecordFormField>
          <RecordFormField label="Template Notes">
            <textarea
              value={draft.templateNotes}
              onChange={(event) => onFieldChange("templateNotes", event.target.value)}
              className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2"
            />
          </RecordFormField>
        </div>

        <div className="rounded-lg border border-[var(--panel-border)] px-4 py-4 text-sm text-[var(--foreground)]/70">
          Create the template first, then add template items and services from the template detail view.
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onCreate}
            disabled={isSaving}
            className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}
          >
            {isSaving ? "Creating..." : "Create Template"}
          </button>
        </div>
      </div>
    </RecordModalShell>
  )
}
