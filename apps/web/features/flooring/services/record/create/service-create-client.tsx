"use client"

import { requestJson } from "@/features/flooring/shared/transport/http"
import {
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/features/shared/engines/record-view"
import { buildRecordDetailHref } from "@/features/shared/engines/common/record-entry"
import { EMPTY_SERVICE_FORM, type ServiceForm, type ServiceRow, type UnitOption } from "../../domain/types"
import { ServicePrimaryFieldsSection } from "../panel/sections/service-primary-fields-section"

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
      const payload = await requestJson<{ service: ServiceRow }>("/api/flooring/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/flooring/services", payload.service.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Service Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Service"
        savingLabel="Creating Service..."
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
      <RecordPanelFooter onClose={page.closePage} />
    </div>
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
