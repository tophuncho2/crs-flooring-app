"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { EMPTY_MANUFACTURER_FORM, type ManufacturerForm, type ManufacturerRow } from "@builders/domain"
import { ManufacturerPrimaryFieldsSection } from "./manufacturer-primary-fields-section"

const EMPTY_MANUFACTURER_ROW: ManufacturerRow = {
  id: "new",
  companyName: "",
  agentName: "",
  website: "",
  phone: "",
  email: "",
  productsCount: 0,
  createdAt: "",
  updatedAt: "",
}

function ManufacturerCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<ManufacturerForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_MANUFACTURER_FORM }),
    createRecord: async (localValue) => {
      const payload = await requestJson<{ manufacturer: ManufacturerRow }>("/api/manufacturers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/manufacturers", payload.manufacturer.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Manufacturer Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create Manufacturer"
      savingLabel="Creating Manufacturer..."
      footer={{ onClose: page.closePage }}
    >
      <ManufacturerPrimaryFieldsSection
        manufacturer={EMPTY_MANUFACTURER_ROW}
        draft={controller.primarySection.localValue}
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

export function ManufacturerCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Manufacturer"
      backHref={backHref}
      dirtyMessage="You have unsaved manufacturer changes. Leave this form without saving?"
    >
      {(page) => <ManufacturerCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
