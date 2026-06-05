"use client"

import { useCallback, useState } from "react"
import {
  RecordDrilldownSection,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  RecordSectionShell,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { ManagementCompanyDetail } from "@builders/domain"
import { EmbeddedPropertyRecordView } from "@/modules/properties/components/record/embedded-property-record-view"
import { LinkedPropertiesList } from "@/modules/properties/components/record/linked-properties-list"
import { TemplatesSectionList } from "@/modules/templates/components/record/templates-section-list"
import { useMcPrimarySection } from "@/modules/management-companies/controllers/record/primary/use-mc-primary-section"
import { ManagementCompanyCellsSection } from "./management-company-cells-section"

/**
 * The Management Company record view. ① editable MC cells (primary) · ②
 * properties drilldown (list ⇄ embedded Property record view, selection driven
 * by the `?property` URL param the detail client owns) · ③ templates across all
 * the MC's properties (default order is property-name A-Z).
 */
export function ManagementCompanyRecordView({
  page,
  entry,
  selectedPropertyId,
  onSelectProperty,
}: {
  page: RecordDetailClientScaffoldContext
  entry: ManagementCompanyDetail
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
      dirtyLabel: "management company",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Management Company"
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
          title="Properties"
          selectedId={selectedPropertyId}
          onSelect={handleSelectProperty}
          renderList={(select) => (
            <LinkedPropertiesList managementCompanyId={entry.id} onSelect={select} />
          )}
          renderDetail={(id, onBack) => (
            <EmbeddedPropertyRecordView
              key={id}
              propertyId={id}
              hostPage={ctx.page}
              onBack={onBack}
              onDirtyChange={setEmbeddedDirty}
            />
          )}
        />
      ),
    },
    {
      key: "templates",
      type: "item",
      order: 20,
      render: () => (
        <RecordSectionShell title="Templates">
          <TemplatesSectionList filters={{ managementCompanyId: [entry.id] }} />
        </RecordSectionShell>
      ),
    },
  ]

  return (
    <RecordMultiSectionPanel
      page={page}
      sections={sections}
      footer={{ onClose: page.closePage, onDelete: () => void controller.deleteRecord() }}
    />
  )
}
