"use client"

import {
  buildSingleSectionDeleteConfirmationMessage,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { useUnitOfMeasurePrimarySection } from "./controllers/use-unit-of-measure-primary-section"
import { UnitOfMeasurePrimaryFieldsSection } from "./sections/unit-of-measure-primary-fields-section"
import type { UnitOfMeasureRow } from "../../domain/types"

export function UnitOfMeasureRecordPanel({
  page,
  unitOfMeasure,
  canManage,
}: {
  page: RecordDetailClientScaffoldContext
  unitOfMeasure: UnitOfMeasureRow
  canManage: boolean
}) {
  const controller = useUnitOfMeasurePrimarySection({
    page,
    unitOfMeasure,
  })

  return (
    <RecordSingleSectionPanel
      title="Unit Of Measure Details"
      controller={controller}
      canManage={canManage}
      showHeader={false}
      deleteConfirmationMessage={buildSingleSectionDeleteConfirmationMessage({
        entityLabel: "unit of measure",
        description: "If this unit of measure is linked to other records, deletion will be blocked.",
      })}
    >
      <UnitOfMeasurePrimaryFieldsSection
        unitOfMeasure={controller.record}
        draft={controller.primarySection.localValue}
        disabled={!canManage || controller.primarySection.isSaving}
        onChange={(value) => {
          controller.primarySection.setLocalValue({ name: value })
        }}
      />
    </RecordSingleSectionPanel>
  )
}
