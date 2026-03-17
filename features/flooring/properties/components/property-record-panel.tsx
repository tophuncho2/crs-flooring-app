"use client"

import { RecordFormField } from "@/features/flooring/shared/record-form"

type PropertyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: { id: string; name: string } | null
  templates: Array<{
    id: string
    templateTag: string
    warehouseName: string
    itemsCount: number
  }>
}

type DraftTemplate = {
  templateTag: string
  propertyId: string
  warehouseId: string
  instructions: string
  templateNotes: string
  padProductId: string
}

export function PropertyRecordPanel({
  property,
  isTemplateCreateOpen,
  newTemplateDraft,
  warehouseOptions,
  padProductOptions,
  loadingTemplate,
  onTemplateDraftChange,
  onOpenTemplate,
  onOpenCreateTemplate,
  onCancelCreateTemplate,
  onCreateTemplate,
  isCreatingTemplate = false,
}: {
  property: PropertyRow
  isTemplateCreateOpen: boolean
  newTemplateDraft: DraftTemplate
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  loadingTemplate: boolean
  onTemplateDraftChange: (field: keyof DraftTemplate, value: string) => void
  onOpenTemplate: (templateId: string) => void
  onOpenCreateTemplate?: () => void
  onCancelCreateTemplate?: () => void
  onCreateTemplate?: () => void
  isCreatingTemplate?: boolean
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Address</p>
          <p className="mt-1 font-medium">{property.fullAddress || "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Management Company</p>
          <p className="mt-1 font-medium">{property.managementCompany?.name || "None"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Phone</p>
          <p className="mt-1 font-medium">{property.phone || "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Email</p>
          <p className="mt-1 font-medium">{property.email || "-"}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Templates</h3>
            <p className="text-sm text-[var(--foreground)]/70">Open a template in a nested record panel or create a new one for this property.</p>
          </div>
          {onOpenCreateTemplate ? (
            <button type="button" onClick={onOpenCreateTemplate} className="rounded border border-blue-500/40 px-3 py-2 text-sm text-blue-500 hover:bg-blue-500/10">
              New Template
            </button>
          ) : null}
        </div>

        {isTemplateCreateOpen && onCancelCreateTemplate && onCreateTemplate ? (
          <div className="grid gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] p-4 md:grid-cols-2">
            <RecordFormField label="Template Tag">
              <input value={newTemplateDraft.templateTag} onChange={(event) => onTemplateDraftChange("templateTag", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="Warehouse">
              <select value={newTemplateDraft.warehouseId} onChange={(event) => onTemplateDraftChange("warehouseId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                <option value="">No warehouse</option>
                {warehouseOptions.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                ))}
              </select>
            </RecordFormField>
            <RecordFormField label="Pad Type">
              <select value={newTemplateDraft.padProductId} onChange={(event) => onTemplateDraftChange("padProductId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                <option value="">No pad type</option>
                {padProductOptions.map((product) => (
                  <option key={product.id} value={product.id}>{product.label}</option>
                ))}
              </select>
            </RecordFormField>
            <RecordFormField label="Instructions">
              <textarea value={newTemplateDraft.instructions} onChange={(event) => onTemplateDraftChange("instructions", event.target.value)} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="Template Notes">
              <textarea value={newTemplateDraft.templateNotes} onChange={(event) => onTemplateDraftChange("templateNotes", event.target.value)} className="h-24 rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <div className="flex items-end justify-end gap-2 md:col-span-2">
              <button type="button" onClick={onCancelCreateTemplate} className="rounded border border-[var(--panel-border)] px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={onCreateTemplate} disabled={isCreatingTemplate} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isCreatingTemplate ? "Creating..." : "Create Template"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--panel-border)]">
          {property.templates.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">No templates for this property yet.</p>
          ) : (
            property.templates.map((template) => (
              <button key={template.id} type="button" onClick={() => onOpenTemplate(template.id)} className="flex w-full items-center justify-between border-t border-[var(--panel-border)] px-4 py-3 text-left first:border-t-0 hover:bg-[var(--panel-hover)]">
                <div>
                  <p className="font-medium">{template.templateTag}</p>
                  <p className="text-sm text-[var(--foreground)]/70">{template.warehouseName || "No warehouse"} • {template.itemsCount} rows</p>
                </div>
                <span className="text-sm text-blue-500">{loadingTemplate ? "Loading..." : "Open"}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
