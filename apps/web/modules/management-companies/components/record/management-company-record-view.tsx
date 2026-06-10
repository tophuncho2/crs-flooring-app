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
import type { ManagementCompanyDetail } from "@builders/domain"
import {
  buildCurrentRecordEntryPath,
  buildPropertyRecordHref,
  buildRecordCreateHref,
} from "@/hooks/navigation/routes"
import { useMcPrimarySection } from "@/modules/management-companies/controllers/record/primary/use-mc-primary-section"
import { LinkedPropertiesList } from "./properties/linked-properties-list"
import { ManagementCompanyCellsSection } from "./primary/management-company-cells-section"
import { ManagementCompanyTemplatesSection } from "./templates/management-company-templates-section"

/**
 * The Management Company record view. ① editable MC cells (primary) · ② the
 * linked-properties list — clicking a row **navigates** to that property's
 * standalone record view (no longer an inline drilldown); "+ Property" opens the
 * management form pre-linked to this company · ③ the shared templates reference
 * section, scoped to this MC (its picker locked) with a selectable Property
 * filter, previewing a chosen template read-only.
 */
export function ManagementCompanyRecordView({
  page,
  entry,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ManagementCompanyDetail
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const controller = useMcPrimarySection({ page, entry })
  const primary = controller.primarySection
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

  const returnTo = buildCurrentRecordEntryPath(pathname, searchParams)

  const openProperty = (propertyId: string) => {
    router.push(buildPropertyRecordHref(propertyId, entry.id, returnTo))
  }

  // "+ Property" opens the single management form (the hub create flow),
  // pre-linked to this company so the operator only fills the property fields.
  const createProperty = () => {
    router.push(
      buildRecordCreateHref("/dashboard/management-companies", {
        returnTo,
        params: { managementCompanyId: entry.id, managementCompanyLabel: entry.name },
      }),
    )
  }

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "management company",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Management Company"
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
          deleteLabel="Delete Management Company"
        >
          <ManagementCompanyCellsSection
            form={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
          />
        </RecordPrimarySectionInstance>
      ),
    },
    {
      key: "properties",
      type: "item",
      order: 10,
      render: () => (
        <LinkedPropertiesList
          managementCompanyId={entry.id}
          onSelect={openProperty}
          onCreate={createProperty}
        />
      ),
    },
    {
      key: "templates",
      type: "item",
      order: 20,
      render: (ctx) => (
        <ManagementCompanyTemplatesSection page={ctx.page} managementCompany={entry} />
      ),
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter onClose={page.closePage} />
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete management company?"
        message={
          entry.propertyCount > 0
            ? `This will unlink ${entry.propertyCount} ${
                entry.propertyCount === 1 ? "property" : "properties"
              } from this management company. This cannot be undone.`
            : "This cannot be undone."
        }
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
