"use client"

import { useCallback, useState } from "react"
import {
  RecordDrilldownSection,
  RecordEntityFooter,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { ManagementCompanyDetail } from "@builders/domain"
import { PropertyCreateView } from "./properties/property-create-view"
import { PropertyRecordView } from "./properties/property-record-view"
import { LinkedPropertiesList } from "./properties/linked-properties-list"
import { TemplatesSectionList } from "@/modules/templates/components/record/templates-section-list"
import { useMcPrimarySection } from "@/modules/management-companies/controllers/record/primary/use-mc-primary-section"
import { ManagementCompanyCellsSection } from "./management-company-cells-section"

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
      // MC-wide list too would duplicate it.
      visibleWhen: () => selectedPropertyId === null,
      render: () => <TemplatesSectionList filters={{ managementCompanyId: [entry.id] }} />,
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={() => controller.deleteRecord()}
        deleteLabel="Delete Management Company"
        confirmTitle="Delete management company?"
      />
    </>
  )
}
