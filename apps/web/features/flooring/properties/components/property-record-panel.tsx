"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/ui/feedback/feedback-states"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"
import { getSharedFormFieldClass } from "@/features/flooring/shared/ui/forms/form-field-styles"
import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import { LinkedRecordsSection } from "@/features/flooring/shared/ui/record-page/linked-records-section"
import type { RecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import type { PropertyDetailRecord, PropertyTemplateDraft } from "../controllers/use-property-record-controller"

export function PropertyRecordPanel({
  property,
  draft,
  managementOptions = [],
  notices,
  loading = false,
  loadError = "",
  isTemplateCreateOpen,
  newTemplateDraft,
  warehouseOptions,
  padProductOptions,
  loadingTemplateId,
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
  property: PropertyDetailRecord | null
  draft: {
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
  notices: RecordNotices
  loading?: boolean
  loadError?: string
  isTemplateCreateOpen: boolean
  newTemplateDraft: PropertyTemplateDraft
  warehouseOptions: Array<{ id: string; name: string }>
  padProductOptions: Array<{ id: string; label: string }>
  loadingTemplateId?: string | null
  isSaving?: boolean
  onDraftChange: (field: "name" | "streetAddress" | "city" | "state" | "zip" | "phone" | "email" | "managementCompanyId", value: string) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  onTemplateDraftChange: (field: keyof PropertyTemplateDraft, value: string) => void
  onOpenTemplate: (templateId: string) => void
  onOpenCreateTemplate: () => void
  onCancelCreateTemplate: () => void
  onCreateTemplate: () => void
  isCreatingTemplate?: boolean
}) {
  if (loading && !property) {
    return <CenteredLoadingState label="Loading property..." />
  }

  if (loadError && !property) {
    return <CenteredErrorState title="Error" message={loadError} onDismiss={onClose} />
  }

  if (!property) {
    return <CenteredErrorState title="Error" message="Property could not be loaded." onDismiss={onClose} />
  }

  const fullAddress = [draft.streetAddress, draft.city, draft.state, draft.zip].filter(Boolean).join(", ")

  return (
    <div className="space-y-6">
      <FormStatusNotices
        message={notices.message}
        error={notices.error}
        loadingMessage={isSaving ? "Saving property..." : isCreatingTemplate ? "Creating template..." : ""}
      />

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

      <LinkedRecordsSection
        title="Templates"
        rows={property.templates.map((template) => ({
          id: template.id,
          title: template.templateTag,
          secondary: `${template.warehouseName || "No warehouse"} • ${template.itemsCount} rows`,
        }))}
        emptyMessage="No templates for this property yet."
        onOpenRow={onOpenTemplate}
        loadingRowId={loadingTemplateId}
        actions={
          <button type="button" onClick={onOpenCreateTemplate} className="rounded border border-blue-500/40 px-3 py-2 text-sm text-blue-500 hover:bg-blue-500/10">
            New Template
          </button>
        }
        inlineCreate={
          isTemplateCreateOpen ? (
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
          ) : null
        }
      />

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
    </div>
  )
}
