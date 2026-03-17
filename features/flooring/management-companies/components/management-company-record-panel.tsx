"use client"

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
  isPropertyCreateOpen,
  propertyDraft,
  loadingPropertyId,
  onPropertyDraftChange,
  onOpenProperty,
  onOpenCreateProperty,
  onCancelCreateProperty,
  onCreateProperty,
  isCreatingProperty = false,
}: {
  company: ManagementCompanyRow
  isPropertyCreateOpen: boolean
  propertyDraft: DraftProperty
  loadingPropertyId: string | null
  onPropertyDraftChange: (field: keyof DraftProperty, value: string) => void
  onOpenProperty: (propertyId: string) => void
  onOpenCreateProperty: () => void
  onCancelCreateProperty: () => void
  onCreateProperty: () => void
  isCreatingProperty?: boolean
}) {
  return (
    <div className="space-y-6">
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
    </div>
  )
}
