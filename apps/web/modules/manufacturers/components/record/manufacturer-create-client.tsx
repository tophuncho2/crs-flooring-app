"use client"

import { RecordCreateClientScaffold } from "@/scaffolds/record-create-client-scaffold"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import { RecordSingleSectionPanel } from "@/components/sections/panels/record-single-section-panel"
import { useSingleSectionCreateController } from "@/controllers/record/use-single-section-create-controller"
import { buildRecordDetailHref } from "@/hooks/navigation/routes"
import { createManufacturerRequest } from "@/modules/manufacturers/data/mutations"
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
      const payload = await createManufacturerRequest(localValue)

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
