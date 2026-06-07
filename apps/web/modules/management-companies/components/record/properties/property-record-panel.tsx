"use client"

import { useState } from "react"
import {
  RecordBackButton,
  RecordFooterNeutralButton,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import type { ManagementCompanyOption, PropertyDetailRecord } from "@builders/domain"
import { TemplatesSectionList } from "@/modules/templates/components/record/templates-section-list"
import { usePropertyPrimarySection } from "@/modules/management-companies/controllers/record/properties/use-property-primary-section"
import { PropertyPrimaryFieldsSection } from "./primary/property-primary-fields-section"

/**
 * The Property record view body. Properties no longer have a standalone page —
 * this always renders **embedded** inside a management company's record view
 * (its properties drilldown, or the MC create flow), sharing the host page
 * controller. Sections: ① property cells + editable MC picker (the primary,
 * headerless under the host's back bar), ② templates for this property.
 *
 * `deletable` (the drilldown edit view) adds a "Delete Property" button to the
 * primary section's action row, right of Discard; the MC create flow omits it.
 * Delete routes back through the shared page controller on success.
 *
 * `onShowList` is the in-section drilldown flip (clears `?property`, swaps this
 * section back to its linked-properties list). When provided (the MC edit
 * drilldown) the leading action is a "Show list" button wired to it — NOT a
 * route, and unrelated to the top-left record back button. When omitted (the MC
 * create flow, which embeds a single property with no list to flip to) the
 * leading action falls back to a real "Back" that routes via the page controller.
 */
export function PropertyRecordPanel({
  page,
  entry,
  onDirtyChange,
  deletable = false,
  onShowList,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
  onDirtyChange?: (isDirty: boolean) => void
  deletable?: boolean
  onShowList?: () => void
}) {
  const controller = usePropertyPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record
  const [mcLabel, setMcLabel] = useState<string | null>(
    record.managementCompany?.name ?? null,
  )
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

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 10,
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
          onDelete={deletable ? () => setConfirmDeleteOpen(true) : undefined}
          deleteLabel="Delete Property"
          actionsLeading={
            onShowList ? (
              <RecordFooterNeutralButton onClick={onShowList}>Show list</RecordFooterNeutralButton>
            ) : (
              <RecordBackButton onClick={page.closePage} label="Back" />
            )
          }
        >
          <PropertyPrimaryFieldsSection
            draft={primary.localValue}
            editable={!primary.isSaving}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous) => ({ ...previous, [field]: value }))
            }
            managementCompanyLabel={mcLabel}
            onManagementCompanyOption={(option: ManagementCompanyOption | null) =>
              setMcLabel(option?.name ?? null)
            }
          />
        </RecordPrimarySectionInstance>
      ),
    },
    {
      key: "templates",
      type: "item",
      order: 20,
      render: () => <TemplatesSectionList filters={{ propertyId: [entry.id] }} />,
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} onDirtyChange={onDirtyChange} />
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
