"use client"

import {
  buildSingleSectionDeleteConfirmationMessage,
  RecordSingleSectionPanel,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { useServicePrimarySection } from "./controllers/use-service-primary-section"
import { ServicePrimaryFieldsSection } from "./sections/service-primary-fields-section"
import type { ServiceForm, ServiceRow, UnitOption } from "../../domain/types"

export function ServiceRecordPanel({
  page,
  service,
  unitOptions,
}: {
  page: RecordDetailClientScaffoldContext
  service: ServiceRow
  unitOptions: UnitOption[]
}) {
  const controller = useServicePrimarySection({
    page,
    service,
  })

  return (
    <RecordSingleSectionPanel
      title="Service Details"
      controller={controller}
      showHeader={false}
      saveLabel="Save Service"
      savingLabel="Saving Service..."
      deleteLabel="Delete Service"
      deleteConfirmationMessage={buildSingleSectionDeleteConfirmationMessage({
        entityLabel: "service",
        description: "If this service is linked to templates or work orders, deletion will be blocked.",
      })}
    >
      <ServicePrimaryFieldsSection
        service={controller.record}
        draft={controller.primarySection.localValue}
        unitOptions={unitOptions}
        disabled={controller.primarySection.isSaving}
        onFieldChange={(field, value) => {
          controller.primarySection.setLocalValue((previous: ServiceForm) => ({
            ...previous,
            [field]: value,
          }))
        }}
      />
    </RecordSingleSectionPanel>
  )
}
