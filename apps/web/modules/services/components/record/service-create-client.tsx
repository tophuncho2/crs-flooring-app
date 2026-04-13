"use client"

import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { createServiceRequest } from "@/modules/services/data/mutations"
import { EMPTY_SERVICE_FORM, type ServiceForm, type ServiceRow, type UnitOption } from "@builders/domain"
import { ServicePrimaryFieldsSection } from "./service-primary-fields-section"

const EMPTY_SERVICE: ServiceRow = {
  id: "new",
  name: "",
  unitId: "",
  unitName: "",
  baseCost: "",
  notes: "",
  usageCount: 0,
  createdAt: "",
  updatedAt: "",
}

function ServiceCreatePanel({
  page,
  backHref,
  unitOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  unitOptions: UnitOption[]
}) {
  const controller = useSingleSectionCreateController<ServiceForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_SERVICE_FORM }),
    createRecord: async (localValue) => {
      const payload = await createServiceRequest(localValue)

      return {
        redirectTo: buildRecordDetailHref("/dashboard/services", payload.service.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Service Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create Service"
      savingLabel="Creating Service..."
      footer={{ onClose: page.closePage }}
    >
      <ServicePrimaryFieldsSection
        service={EMPTY_SERVICE}
        draft={controller.primarySection.localValue}
        unitOptions={unitOptions}
        disabled={controller.primarySection.isSaving}
        onFieldChange={(field, value) => {
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }}
      />
    </RecordSingleSectionPanel>
  )
}

export function ServiceCreateClient({
  backHref,
  unitOptions,
}: {
  backHref: string
  unitOptions: UnitOption[]
}) {
  return (
    <RecordCreateClientScaffold
      title="New Service"
      backHref={backHref}
      dirtyMessage="You have unsaved service changes. Leave this form without saving?"
    >
      {(page) => <ServiceCreatePanel page={page} backHref={backHref} unitOptions={unitOptions} />}
    </RecordCreateClientScaffold>
  )
}
