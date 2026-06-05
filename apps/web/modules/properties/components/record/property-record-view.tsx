"use client"

import { useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import type { ManagementCompanyOption, PropertyDetailRecord } from "@builders/domain"
import { TemplatesSectionList } from "@/modules/templates/components/record/templates-section-list"
import { usePropertyPrimarySection } from "@/modules/properties/controllers/record/primary/use-property-primary-section"
import { PropertyPrimaryFieldsSection } from "./primary/property-primary-fields-section"

/**
 * The Property record view body. Properties no longer have a standalone page —
 * this always renders **embedded** inside a management company's record view
 * (its properties drilldown, or the MC create flow), sharing the host page
 * controller. Sections: ① property cells + editable MC picker (the primary,
 * headerless under the host's back bar), ② templates for this property.
 */
export function PropertyRecordView({
  page,
  entry,
  onDirtyChange,
}: {
  page: RecordDetailClientScaffoldContext
  entry: PropertyDetailRecord
  onDirtyChange?: (isDirty: boolean) => void
}) {
  const controller = usePropertyPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record
  const [mcLabel, setMcLabel] = useState<string | null>(
    record.managementCompany?.name ?? null,
  )

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
    <RecordMultiSectionPanel page={page} sections={sections} onDirtyChange={onDirtyChange} />
  )
}
