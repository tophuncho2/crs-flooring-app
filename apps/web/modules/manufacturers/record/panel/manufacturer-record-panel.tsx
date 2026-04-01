"use client"

import {
  buildSingleSectionDeleteConfirmationMessage,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { useManufacturerPrimarySection } from "./controllers/use-manufacturer-primary-section"
import { ManufacturerPrimaryFieldsSection } from "./sections/manufacturer-primary-fields-section"
import type { ManufacturerForm, ManufacturerRow } from "../../domain/types"

export function ManufacturerRecordPanel({
  page,
  manufacturer,
}: {
  page: RecordDetailClientScaffoldContext
  manufacturer: ManufacturerRow
}) {
  const controller = useManufacturerPrimarySection({
    page,
    manufacturer,
  })

  return (
    <RecordSingleSectionPanel
      title="Manufacturer Details"
      controller={controller}
      showHeader={false}
      deleteConfirmationMessage={buildSingleSectionDeleteConfirmationMessage({
        entityLabel: "manufacturer",
        description: "If this manufacturer is linked to products, deletion will be blocked.",
      })}
    >
      <ManufacturerPrimaryFieldsSection
        manufacturer={controller.record}
        draft={controller.primarySection.localValue}
        disabled={controller.primarySection.isSaving}
        onFieldChange={(field, value) => {
          controller.primarySection.setLocalValue((previous: ManufacturerForm) => ({
            ...previous,
            [field]: value,
          }))
        }}
      />
    </RecordSingleSectionPanel>
  )
}
