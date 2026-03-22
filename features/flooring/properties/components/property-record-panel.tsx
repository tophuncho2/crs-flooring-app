"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/features/flooring/shared/display/accent-styles"
import { FormStatusNotices } from "@/features/flooring/shared/feedback/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/forms/record-panel-footer"
import { getSharedFormFieldClass } from "@/features/flooring/shared/forms/form-field-styles"
import { RecordFormField } from "@/features/flooring/shared/forms/record-form"

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
  mode = "view",
  draft,
  managementOptions = [],
  message = "",
  error = "",
  isTemplateCreateOpen,
  newTemplateDraft,
  warehouseOptions,
  padProductOptions,
  loadingTemplate,
  isSaving = false,
  onDraftChange,
  onSave,
  onDelete,
  onClose,
  onTemplateDraftChange,
  onOpenTemplate,
  onOpenCreateTemplate,
  onCancelCreateTemplate,
  onCreateTemplate,
  isCreatingTemplate = false,
}: {
  property: PropertyRow
  mode?: "view" | "edit"
  draft?: {
    name: string
    streetAddress: string
    city: string
    state: string
    zip: string
    phone: string
    email: string
    managementCompanyId: string
  }
  managementOptions?: Array<{ id: string; name: string }>
  message?: string
  error?: string
  isTemplateCreateOpen: boolean
  newTemplateDraft: DraftTemplate
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  loadingTemplate: boolean
  isSaving?: boolean
  onDraftChange?: (field: "name" | "streetAddress" | "city" | "state" | "zip" | "phone" | "email" | "managementCompanyId", value: string) => void
  onSave?: () => void
  onDelete?: () => void
  onClose?: () => void
  onTemplateDraftChange: (field: keyof DraftTemplate, value: string) => void
  onOpenTemplate: (templateId: string) => void
  onOpenCreateTemplate?: () => void
  onCancelCreateTemplate?: () => void
  onCreateTemplate?: () => void
  isCreatingTemplate?: boolean
}) {
  const isEditing = mode === "edit" && draft && onDraftChange && onSave && onDelete && onClose
  const fullAddress = isEditing
    ? [draft.streetAddress, draft.city, draft.state, draft.zip].filter(Boolean).join(", ")
    : property.fullAddress

  return (
    <div className="space-y-6">
      <FormStatusNotices message={message} error={error} loadingMessage={isSaving ? "Saving property..." : ""} />

      {isEditing ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RecordFormField label="Property Name">
            <input value={draft.name} onChange={(event) => onDraftChange("name", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: draft.name.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="Street Address">
            <input value={draft.streetAddress} onChange={(event) => onDraftChange("streetAddress", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.streetAddress.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="City">
            <input value={draft.city} onChange={(event) => onDraftChange("city", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.city.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="State">
            <input value={draft.state} onChange={(event) => onDraftChange("state", event.target.value)} maxLength={2} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.state.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="Zip">
            <input value={draft.zip} onChange={(event) => onDraftChange("zip", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.zip.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="Management Company">
            <select value={draft.managementCompanyId} onChange={(event) => onDraftChange("managementCompanyId", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.managementCompanyId.trim() === "" })}`}>
              <option value="">No management company</option>
              {managementOptions.map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Phone">
            <input value={draft.phone} onChange={(event) => onDraftChange("phone", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.phone.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="Email">
            <input value={draft.email} onChange={(event) => onDraftChange("email", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.email.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="Full Address">
            <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">{fullAddress || "Property address preview"}</div>
          </RecordFormField>
        </div>
      ) : (
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
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Templates</h3>
            <p className="text-sm text-[var(--foreground)]/70">View a template detail page or create a new one for this property.</p>
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
              <button type="button" onClick={onCreateTemplate} disabled={isCreatingTemplate} className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}>
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
                <span className="text-sm text-blue-500">{loadingTemplate ? "Loading..." : "View"}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {isEditing ? (
        <RecordPanelFooter
          deleteLabel="Delete Property"
          deleteConfirmMessage={`Delete ${property.name}?`}
          onDelete={onDelete}
          onClose={onClose}
          saveLabel="Save Property"
          savingLabel="Saving..."
          onSave={onSave}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  )
}
