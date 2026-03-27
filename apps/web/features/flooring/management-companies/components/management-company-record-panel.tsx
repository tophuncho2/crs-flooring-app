"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME } from "@/features/flooring/shared/ui/display/accent-styles"
import { CenteredErrorState, CenteredLoadingState } from "@/features/flooring/shared/ui/feedback/feedback-states"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"
import { getSharedFormFieldClass } from "@/features/flooring/shared/ui/forms/form-field-styles"
import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import { RecordLinkedChildTableSection } from "@/features/flooring/shared/ui/record-page/record-linked-child-table-section"
import { RecordSection, RecordSectionStack } from "@/features/flooring/shared/ui/record-page/record-sections"
import {
  RecordPrimaryFieldCell,
  RecordPrimaryFieldsGrid,
  RecordPrimaryPane,
  RecordPrimarySection,
  RecordStaticFieldValue,
} from "@/features/flooring/shared/ui/record-items/record-primary-fields"
import type { RecordNotices } from "@/features/flooring/shared/controllers/record-page/use-record-notices"
import type { ManagementCompanyDetailRecord, ManagementCompanyPropertyDraft } from "../controllers/use-management-company-record-controller"

export function ManagementCompanyRecordPanel({
  company,
  draft,
  notices,
  loading = false,
  loadError = "",
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
  company: ManagementCompanyDetailRecord | null
  draft: {
    name: string
    streetAddress: string
    city: string
    state: string
    zip: string
    phone: string
    email: string
  }
  notices: RecordNotices
  loading?: boolean
  loadError?: string
  isPropertyCreateOpen: boolean
  propertyDraft: ManagementCompanyPropertyDraft
  loadingPropertyId: string | null
  isSaving?: boolean
  onDraftChange: (field: "name" | "streetAddress" | "city" | "state" | "zip" | "phone" | "email", value: string) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
  onPropertyDraftChange: (field: keyof ManagementCompanyPropertyDraft, value: string) => void
  onOpenProperty: (propertyId: string) => void
  onOpenCreateProperty: () => void
  onCancelCreateProperty: () => void
  onCreateProperty: () => void
  isCreatingProperty?: boolean
}) {
  if (loading && !company) {
    return <CenteredLoadingState label="Loading management company..." />
  }

  if (loadError && !company) {
    return <CenteredErrorState title="Error" message={loadError} onDismiss={onClose} />
  }

  if (!company) {
    return <CenteredErrorState title="Error" message="Management company could not be loaded." onDismiss={onClose} />
  }

  const fullAddress = [draft.streetAddress, draft.city, draft.state, draft.zip].filter(Boolean).join(", ")

  return (
    <div className="space-y-6">
      <FormStatusNotices
        message={notices.message}
        error={notices.error}
        loadingMessage={isSaving ? "Saving management company..." : isCreatingProperty ? "Creating property..." : ""}
      />

      <RecordSectionStack>
        <RecordSection>
          <RecordPrimarySection>
            <RecordPrimaryPane variant="side">
              <RecordPrimaryFieldsGrid variant="side">
                <RecordPrimaryFieldCell>
                  <RecordFormField label="Phone">
                    <input value={draft.phone} onChange={(event) => onDraftChange("phone", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.phone.trim() === "" })}`} />
                  </RecordFormField>
                </RecordPrimaryFieldCell>
                <RecordPrimaryFieldCell>
                  <RecordFormField label="Email">
                    <input value={draft.email} onChange={(event) => onDraftChange("email", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.email.trim() === "" })}`} />
                  </RecordFormField>
                </RecordPrimaryFieldCell>
              </RecordPrimaryFieldsGrid>
            </RecordPrimaryPane>

            <RecordPrimaryPane variant="main">
              <RecordPrimaryFieldsGrid>
                <RecordPrimaryFieldCell size="md">
                  <RecordFormField label="Company Name">
                    <input value={draft.name} onChange={(event) => onDraftChange("name", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: true, isEmpty: draft.name.trim() === "" })}`} />
                  </RecordFormField>
                </RecordPrimaryFieldCell>
                <RecordPrimaryFieldCell size="lg">
                  <RecordFormField label="Street Address">
                    <input value={draft.streetAddress} onChange={(event) => onDraftChange("streetAddress", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.streetAddress.trim() === "" })}`} />
                  </RecordFormField>
                </RecordPrimaryFieldCell>
                <RecordPrimaryFieldCell size="sm">
                  <RecordFormField label="City">
                    <input value={draft.city} onChange={(event) => onDraftChange("city", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.city.trim() === "" })}`} />
                  </RecordFormField>
                </RecordPrimaryFieldCell>
                <RecordPrimaryFieldCell size="sm">
                  <RecordFormField label="State">
                    <input value={draft.state} onChange={(event) => onDraftChange("state", event.target.value)} maxLength={2} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.state.trim() === "" })}`} />
                  </RecordFormField>
                </RecordPrimaryFieldCell>
                <RecordPrimaryFieldCell size="sm">
                  <RecordFormField label="Zip">
                    <input value={draft.zip} onChange={(event) => onDraftChange("zip", event.target.value)} className={`rounded border px-3 py-2 ${getSharedFormFieldClass({ isRequired: false, isEmpty: draft.zip.trim() === "" })}`} />
                  </RecordFormField>
                </RecordPrimaryFieldCell>
                <RecordPrimaryFieldCell size="lg">
                  <RecordFormField label="Full Address">
                    <RecordStaticFieldValue size="lg">{fullAddress || "Company address preview"}</RecordStaticFieldValue>
                  </RecordFormField>
                </RecordPrimaryFieldCell>
              </RecordPrimaryFieldsGrid>
            </RecordPrimaryPane>
          </RecordPrimarySection>
        </RecordSection>

        <RecordSection>
          <RecordLinkedChildTableSection
            title="Properties"
            rows={company.properties.map((property) => ({
              id: property.id,
              primary: property.name,
              context: property.fullAddress || "No address",
            }))}
            emptyMessage="No properties linked to this management company yet."
            onOpenRow={onOpenProperty}
            loadingRowId={loadingPropertyId}
            actions={
              <button type="button" onClick={onOpenCreateProperty} className="rounded border border-blue-500/40 px-3 py-2 text-sm text-blue-500 hover:bg-blue-500/10">
                New Property
              </button>
            }
            inlineCreate={
              isPropertyCreateOpen ? (
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
                    <button type="button" onClick={onCreateProperty} disabled={isCreatingProperty} className={FLOORING_PRIMARY_ACTION_BUTTON_CLASS_NAME}>
                      {isCreatingProperty ? "Creating..." : "Create Property"}
                    </button>
                  </div>
                </div>
              ) : null
            }
          />
        </RecordSection>
      </RecordSectionStack>

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
    </div>
  )
}
