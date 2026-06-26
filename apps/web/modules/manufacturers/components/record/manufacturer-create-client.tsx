"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_MANUFACTURER_FORM, type ManufacturerForm } from "@builders/domain"
import { createManufacturerRequest } from "@/modules/manufacturers/data/mutations"
import { ManufacturerPrimaryFieldsSection } from "./primary/manufacturer-primary-fields-section"

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
      const { manufacturer } = await createManufacturerRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/manufacturers", manufacturer.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Manufacturer Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <ManufacturerPrimaryFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        onFieldChange={(field, value) =>
          controller.primarySection.setLocalValue((previous) => ({
            ...previous,
            [field]: value,
          }))
        }
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
