"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/features/flooring/shared/accent-styles"
import { FormStatusNotices } from "@/features/flooring/shared/notices"
import { RecordFormField, RecordModalShell } from "@/features/flooring/shared/record-form"
import type { PropertyOption, TemplateOption } from "../types"

export function WorkOrderSyncModal({
  propertyOptions,
  filteredTemplates,
  syncPropertyId,
  syncTemplateSearch,
  selectedTemplateId,
  message,
  error,
  isCreating,
  onClose,
  onPropertyChange,
  onSearchChange,
  onTemplateSelect,
  onCreate,
}: {
  propertyOptions: PropertyOption[]
  filteredTemplates: TemplateOption[]
  syncPropertyId: string
  syncTemplateSearch: string
  selectedTemplateId: string
  message: string
  error: string
  isCreating: boolean
  onClose: () => void
  onPropertyChange: (propertyId: string) => void
  onSearchChange: (value: string) => void
  onTemplateSelect: (templateId: string) => void
  onCreate: () => void
}) {
  return (
    <RecordModalShell title="Create Work Order From Template" onClose={onClose}>
      <div className="space-y-6">
        <FormStatusNotices message={message} error={error} />

        <div className="grid gap-4 lg:grid-cols-[280px,minmax(0,1fr)]">
          <div className="space-y-4">
            <RecordFormField label="Property">
              <select
                value={syncPropertyId}
                onChange={(event) => onPropertyChange(event.target.value)}
                className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2"
              >
                <option value="">Select Property</option>
                {propertyOptions.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
            </RecordFormField>

            <RecordFormField label="Search Templates">
              <input
                value={syncTemplateSearch}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder={syncPropertyId ? "Search template tag" : "Select property first"}
                disabled={!syncPropertyId}
                className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2 disabled:opacity-60"
              />
            </RecordFormField>

            <div className="rounded-lg border border-[var(--panel-border)] px-3 py-3 text-sm text-[var(--foreground)]/70">
              Select the property first, search its templates, then create the work order. The new row will be created from that template and opened immediately.
            </div>
          </div>

          <div className="space-y-3">
            <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--panel-border)]">
              {!syncPropertyId ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">Select a property to load templates.</p>
              ) : filteredTemplates.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">No templates available for the selected property.</p>
              ) : (
                filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => onTemplateSelect(template.id)}
                    className={`flex w-full items-center justify-between border-t border-[var(--panel-border)] px-4 py-3 text-left first:border-t-0 ${selectedTemplateId === template.id ? "bg-blue-500/10 text-blue-500" : "hover:bg-[var(--panel-hover)]"}`}
                  >
                    <span>{template.label}</span>
                    <span className="text-xs uppercase tracking-[0.18em]">{selectedTemplateId === template.id ? "Selected" : "Open"}</span>
                  </button>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onCreate}
                disabled={isCreating || !syncPropertyId || !selectedTemplateId}
                className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}
              >
                {isCreating ? "Creating..." : "Create And Open Work Order"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </RecordModalShell>
  )
}
