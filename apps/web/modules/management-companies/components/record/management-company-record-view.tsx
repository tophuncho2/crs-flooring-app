"use client"

import { useCallback, useState } from "react"
import {
  RecordDrilldownSection,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  recordPrimaryEditable,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { ManagementCompanyDetail } from "@builders/domain"
import { ConfirmDialog } from "@/engines/record-view"
import { PropertyCreateView } from "./properties/property-create-view"
import { PropertyRecordView } from "./properties/property-record-view"
import { LinkedPropertiesList } from "./properties/linked-properties-list"
import { TemplateReferenceSection } from "./templates/template-reference-section"
import { useMcPrimarySection } from "@/modules/management-companies/controllers/record/primary/use-mc-primary-section"
import { ManagementCompanyCellsSection } from "./primary/management-company-cells-section"

/**
 * The Management Company record view. ① editable MC cells (primary) · ②
 * properties drilldown (list ⇄ embedded Property record view, selection driven
 * by the `?property` URL param the detail client owns) · ③ templates across all
 * the MC's properties (default order is property-name A-Z).
 */
/** Sentinel `?property` value that opens the embedded "new property" create form. */
const NEW_PROPERTY_ID = "new"

export function ManagementCompanyRecordView({
  page,
  entry,
  backHref,
  selectedPropertyId,
  onSelectProperty,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ManagementCompanyDetail
  backHref: string
  selectedPropertyId: string | null
  onSelectProperty: (propertyId: string | null) => void
}) {
  const controller = useMcPrimarySection({ page, entry })
  const primary = controller.primarySection
  const [embeddedDirty, setEmbeddedDirty] = useState(false)
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

  // Clear the bridged embedded-dirty flag as we leave the embedded property,
  // so backing out of a (clean or discarded) property doesn't leave the MC
  // page falsely dirty.
  const handleSelectProperty = useCallback(
    (id: string | null) => {
      if (id === null) setEmbeddedDirty(false)
      onSelectProperty(id)
    },
    [onSelectProperty],
  )

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
            // Lock the MC fields while a property is open below — the operator
            // is reading the MC, not editing it (mirrors inventory ⇄ adjustments).
            editable={recordPrimaryEditable({
              isSaving: primary.isSaving,
              drilldownOpen: selectedPropertyId !== null,
            })}
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
      dirtyLabel: "property",
      controller: { isDirty: embeddedDirty },
      render: (ctx) => (
        <RecordDrilldownSection
          page={ctx.page}
          selectedId={selectedPropertyId}
          onSelect={handleSelectProperty}
          hideBackBar
          renderList={(select) => (
            <LinkedPropertiesList
              managementCompanyId={entry.id}
              onSelect={select}
              onCreate={() => handleSelectProperty(NEW_PROPERTY_ID)}
            />
          )}
          renderDetail={(id, onBack) =>
            id === NEW_PROPERTY_ID ? (
              <PropertyCreateView
                managementCompanyId={entry.id}
                managementCompanyName={entry.name}
                hostPage={ctx.page}
                backHref={backHref}
                onBack={onBack}
                onDirtyChange={setEmbeddedDirty}
              />
            ) : (
              <PropertyRecordView
                key={id}
                propertyId={id}
                hostPage={ctx.page}
                onBack={onBack}
                onShowList={onBack}
                onDirtyChange={setEmbeddedDirty}
                deletable
              />
            )
          }
        />
      ),
    },
    {
      key: "templates",
      type: "item",
      order: 20,
      // Hidden while a property is drilled in — the embedded property view
      // renders its own (property-scoped) templates section, so showing the
      // MC-wide reference header too would duplicate it.
      visibleWhen: () => selectedPropertyId === null,
      render: (ctx) => (
        <TemplateReferenceSection
          page={ctx.page}
          managementCompanyId={entry.id}
          managementCompanyLabel={entry.name}
        />
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
