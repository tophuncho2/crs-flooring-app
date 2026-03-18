"use client"

import { ErrorNotice, SuccessNotice } from "@/features/flooring/shared/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/record-panel-footer"
import { getSharedFormFieldClass } from "@/features/flooring/shared/form-field-styles"
import { RecordFormField } from "@/features/flooring/shared/record-form"

type DraftProperty = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  managementCompanyId: string
}

type ManagementCompanyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  properties: { id: string; name: string; fullAddress: string }[]
}

export function ManagementCompanyRecordPanel({
  company,
  mode = "view",
  draft,
  message = "",
  error = "",
  isPropertyCreateOpen,
  propertyDraft,
  loadingPropertyId,
  isSaving = false,
  onDraftChange,
  onSave,
  onDelete,
  onClose,
  onPropertyDraftChange,
  onOpenProperty,
  onOpenCreateProperty,
  onCancelCreateProperty,
  onCreateProperty,
  isCreatingProperty = false,
}: {
  company: ManagementCompanyRow
  mode?: "view" | "edit"
  draft?: {
    name: string
    streetAddress: string
    city: string
    state: string
    zip: string
    phone: string
    email: string
  }
  message?: string
  error?: string
  isPropertyCreateOpen: boolean
  propertyDraft: DraftProperty
  loadingPropertyId: string | null
  isSaving?: boolean
  onDraftChange?: (field: "name" | "streetAddress" | "city" | "state" | "zip" | "phone" | "email", value: string) => void
  onSave?: () => void
  onDelete?: () => void
  onClose?: () => void
  onPropertyDraftChange: (field: keyof DraftProperty, value: string) => void
  onOpenProperty: (propertyId: string) => void
  onOpenCreateProperty: () => void
  onCancelCreateProperty: () => void
  onCreateProperty: () => void
  isCreatingProperty?: boolean
}) {
  const isEditing = mode === "edit" && draft && onDraftChange && onSave && onDelete && onClose
  const fullAddress = isEditing
    ? [draft.streetAddress, draft.city, draft.state, draft.zip].filter(Boolean).join(", ")
    : company.fullAddress

  return (
    <div className="space-y-6">
      {message ? <SuccessNotice>{message}</SuccessNotice> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}

      {isEditing ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <RecordFormField label="Company Name">
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
          <RecordFormField label="Phone">
            <input value={draft.phone} onChange={(event) => onDraftChange("phone", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.phone.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="Email">
            <input value={draft.email} onChange={(event) => onDraftChange("email", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.email.trim() === "" })}`} />
          </RecordFormField>
          <RecordFormField label="Full Address">
            <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">{fullAddress || "Company address preview"}</div>
          </RecordFormField>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Address</p>
            <p className="mt-1 font-medium">{company.fullAddress || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Phone</p>
            <p className="mt-1 font-medium">{company.phone || "-"}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Email</p>
            <p className="mt-1 font-medium">{company.email || "-"}</p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Properties</h3>
            <p className="text-sm text-[var(--foreground)]/70">Open a property in a nested panel or add a new property to this management company.</p>
          </div>
          <button type="button" onClick={onOpenCreateProperty} className="rounded border border-blue-500/40 px-3 py-2 text-sm text-blue-500 hover:bg-blue-500/10">
            New Property
          </button>
        </div>

        {isPropertyCreateOpen ? (
          <div className="grid gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] p-4 md:grid-cols-2">
            <RecordFormField label="Property Name">
              <input value={propertyDraft.name} onChange={(event) => onPropertyDraftChange("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="Street Address">
              <input value={propertyDraft.streetAddress} onChange={(event) => onPropertyDraftChange("streetAddress", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="City">
              <input value={propertyDraft.city} onChange={(event) => onPropertyDraftChange("city", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="State">
              <input value={propertyDraft.state} onChange={(event) => onPropertyDraftChange("state", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="Zip">
              <input value={propertyDraft.zip} onChange={(event) => onPropertyDraftChange("zip", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="Phone">
              <input value={propertyDraft.phone} onChange={(event) => onPropertyDraftChange("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <RecordFormField label="Email">
              <input value={propertyDraft.email} onChange={(event) => onPropertyDraftChange("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            </RecordFormField>
            <div className="flex items-end justify-end gap-2 md:col-span-2">
              <button type="button" onClick={onCancelCreateProperty} className="rounded border border-[var(--panel-border)] px-3 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={onCreateProperty} disabled={isCreatingProperty} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isCreatingProperty ? "Creating..." : "Create Property"}
              </button>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-[var(--panel-border)]">
          {company.properties.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--foreground)]/70">No properties linked to this management company yet.</p>
          ) : (
            company.properties.map((property) => (
              <button key={property.id} type="button" onClick={() => onOpenProperty(property.id)} className="flex w-full items-center justify-between border-t border-[var(--panel-border)] px-4 py-3 text-left first:border-t-0 hover:bg-[var(--panel-hover)]">
                <div>
                  <p className="font-medium">{property.name}</p>
                  <p className="text-sm text-[var(--foreground)]/70">{property.fullAddress || "No address"}</p>
                </div>
                <span className="text-sm text-blue-500">{loadingPropertyId === property.id ? "Loading..." : "Open"}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {isEditing ? (
        <RecordPanelFooter
          deleteLabel="Delete Company"
          deleteConfirmMessage={`Delete ${company.name}?`}
          onDelete={onDelete}
          onClose={onClose}
          saveLabel="Save Company"
          savingLabel="Saving..."
          onSave={onSave}
          isSaving={isSaving}
        />
      ) : null}
    </div>
  )
}
