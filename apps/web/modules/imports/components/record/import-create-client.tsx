"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import {
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import {
  EMPTY_IMPORT_PRIMARY_FORM,
  type ImportDetail as ImportRow,
  type ImportPrimaryForm,
} from "@builders/domain"
import type { WarehouseOption } from "../drafts"
import { ImportPrimaryFieldsSection } from "../panel/sections/import-primary-fields-section"

const EMPTY_IMPORT_ROW: ImportRow = {
  id: "new",
  importNumber: 0,
  orderNumber: "",
  tag: "",
  transportType: EMPTY_IMPORT_PRIMARY_FORM.transportType,
  status: EMPTY_IMPORT_PRIMARY_FORM.status,
  notes: "",
  warehouseId: "",
  warehouseName: "",
  itemsCount: 0,
  createdAt: "",
  updatedAt: "",
  inventories: [],
}

function ImportCreatePanel({
  page,
  backHref,
  warehouseOptions,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
  warehouseOptions: WarehouseOption[]
}) {
  const controller = useSingleSectionCreateController<ImportPrimaryForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_IMPORT_PRIMARY_FORM }),
    createRecord: async (localValue) => {
      const payload = await requestJson<{ import: ImportRow }>("/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...localValue,
          items: [],
        }),
      })

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
          entry={EMPTY_IMPORT_ROW}
          draft={controller.primarySection.localValue}
          warehouseOptions={warehouseOptions}
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
}: {
  backHref: string
  warehouseOptions: WarehouseOption[]
}) {
  return (
    <RecordCreateClientScaffold
      title="New Import"
      backHref={backHref}
      dirtyMessage="You have unsaved import changes. Leave this form without saving?"
    >
      {(page) => <ImportCreatePanel page={page} backHref={backHref} warehouseOptions={warehouseOptions} />}
    </RecordCreateClientScaffold>
  )
}
