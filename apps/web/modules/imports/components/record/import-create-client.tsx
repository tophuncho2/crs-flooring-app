"use client"

import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import { createImportRequest } from "@/modules/imports/data/mutations"
import {
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  EMPTY_IMPORT_PRIMARY_FORM,
  type ImportPrimaryForm,
} from "@builders/domain"
import type { ManufacturerOption, WarehouseOption } from "@/modules/imports/controllers/drafts"
import { ImportPrimaryFieldsSection } from "./sections/import-primary-fields-section"

function ImportCreatePanel({
  page,
  backHref,
  warehouseOptions,
  manufacturerOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  warehouseOptions: WarehouseOption[]
  manufacturerOptions: ManufacturerOption[]
}) {
  const controller = useSingleSectionCreateController<ImportPrimaryForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_IMPORT_PRIMARY_FORM }),
    createRecord: async (localValue) => {
      const payload = await createImportRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/imports", payload.import.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Import Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Import"
        savingLabel="Creating Import..."
      >
        <ImportPrimaryFieldsSection
          draft={controller.primarySection.localValue}
          warehouseOptions={warehouseOptions}
          manufacturerOptions={manufacturerOptions}
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

export function ImportCreateClient({
  backHref,
  warehouseOptions,
  manufacturerOptions,
}: {
  backHref: string
  warehouseOptions: WarehouseOption[]
  manufacturerOptions: ManufacturerOption[]
}) {
  return (
    <RecordCreateClientScaffold
      title="New Import"
      backHref={backHref}
      dirtyMessage="You have unsaved import changes. Leave this form without saving?"
    >
      {(page) => (
        <ImportCreatePanel
          page={page}
          backHref={backHref}
          warehouseOptions={warehouseOptions}
          manufacturerOptions={manufacturerOptions}
        />
      )}
    </RecordCreateClientScaffold>
  )
}
