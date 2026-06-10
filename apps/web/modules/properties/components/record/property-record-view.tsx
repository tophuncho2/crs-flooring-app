"use client"

import { useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ConfirmDialog,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import {
  toManagementCompanyForm,
  type ManagementCompanyDetail,
  type PropertyDetailRecord,
} from "@builders/domain"
import {
  buildCurrentRecordEntryPath,
  buildRecordCreateHref,
  buildRecordDetailHref,
} from "@/hooks/navigation/routes"
import { TemplateReferenceSection } from "@/modules/templates/components/record/reference-section/template-reference-section"
import { usePropertyPrimarySection } from "@/modules/properties/controllers/record/use-property-primary-section"
import { PropertyFieldsSection } from "./primary/property-fields-section"
import { LinkedManagementCompanySection } from "./primary/linked-management-company-section"

/**
 * The standalone Property record view. ① the linked management company shown
 * read-only (hand-off to the MC record view) above the editable property cells —
 * one section · ② the shared templates reference section, with both the MC and
 * the property pre-seeded and locked so only a template is choosable for preview.
 *
 * Reached by clicking a property anywhere (the properties list, the MC record
 * view's property list, the WO/template "✎ Property" buttons) — it no longer
 * embeds inside the MC record view.
 */
export function PropertyRecordView({
  page,
  entry,
  managementCompany,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
  managementCompany: ManagementCompanyDetail | null
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const controller = usePropertyPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  async function confirmDelete() {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await controller.deleteRecord()
    } finally {
      setIsDeleting(false)
      setConfirmDeleteOpen(false)
    }
  }

  const linkedMc = record.managementCompany
  const mcForm = managementCompany ? toManagementCompanyForm(managementCompany) : null

  const openManagementCompany = () => {
    if (!linkedMc) return
    router.push(
      buildRecordDetailHref(
        "/dashboard/management-companies",
        linkedMc.id,
        buildCurrentRecordEntryPath(pathname, searchParams),
      ),
    )
  }

  // Orphan property (no company): hand off to the create-MC flow that links this
  // property on save.
  const linkManagementCompany = () => {
    router.push(
      buildRecordCreateHref("/dashboard/management-companies", {
        returnTo: buildCurrentRecordEntryPath(pathname, searchParams),
        params: { property: record.id },
      }),
    )
  }

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "property",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Property"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
          onDelete={() => setConfirmDeleteOpen(true)}
          deleteLabel="Delete Property"
        >
          <div className="flex flex-col gap-4">
            {mcForm ? (
              <LinkedManagementCompanySection
                managementCompany={mcForm}
                onOpen={openManagementCompany}
              />
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--panel-border)] bg-[var(--subpanel-background)] px-4 py-3 text-sm text-[var(--foreground)]/70">
                <span>No management company linked.</span>
                <button
                  type="button"
                  onClick={linkManagementCompany}
                  className="shrink-0 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)]"
                >
                  Add management company
                </button>
              </div>
            )}
            <PropertyFieldsSection
              draft={primary.localValue}
              editable={!primary.isSaving}
              onFieldChange={(field, value) =>
                primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
              }
            />
          </div>
        </RecordPrimarySectionInstance>
      ),
    },
  ]

  if (linkedMc) {
    sections.push({
      key: "templates",
      type: "item",
      order: 20,
      render: (ctx) => (
        <TemplateReferenceSection
          page={ctx.page}
          managementCompany={{ id: linkedMc.id, label: linkedMc.name }}
          property={{ id: record.id, label: record.name }}
          managementCompanySelectable={false}
          propertySelectable={false}
        />
      ),
    })
  }

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter onClose={page.closePage} />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete property?"
        message="This cannot be undone."
        confirmLabel={isDeleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        tone="destructive"
        onConfirm={() => void confirmDelete()}
        onCancel={() => {
          if (!isDeleting) setConfirmDeleteOpen(false)
        }}
      />
    </>
  )
}
