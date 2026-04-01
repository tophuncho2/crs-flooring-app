"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import { buildRecordDetailHref } from "@/modules/shared/engines/common/record-entry"
import {
  createRecordSectionError,
  RecordCreateClientScaffold,
  RecordPanelFooter,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { createWarehouseDetail, toWarehouseDraft, type WarehouseDetail, type WarehouseDraft } from "../../types"
import { WarehousePrimaryFieldsSection } from "../panel/sections/warehouse-primary-fields-section"

const EMPTY_WAREHOUSE_DETAIL: WarehouseDetail = createWarehouseDetail(
  {
    id: "new",
    name: "",
    address: "",
    phone: "",
    sectionsCount: 0,
    locationsCount: 0,
    workOrdersCount: 0,
    createdAt: "",
    updatedAt: "",
  },
  [],
  [],
)

function WarehouseCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<WarehouseDraft>({
    page,
    createInitialValue: () => toWarehouseDraft(EMPTY_WAREHOUSE_DETAIL),
    createRecord: async (localValue) => {
      if (!localValue.name.trim()) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Warehouse name is required.",
          retryable: true,
        })
      }

      const payload = await requestJson<{ warehouse: { id: string } }>("/api/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(localValue),
      })

      return {
        redirectTo: buildRecordDetailHref("/dashboard/warehouse", payload.warehouse.id, backHref),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Warehouse Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Warehouse"
        savingLabel="Creating Warehouse..."
      >
        <WarehousePrimaryFieldsSection
          warehouse={EMPTY_WAREHOUSE_DETAIL}
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
      <RecordPanelFooter onClose={page.closePage} />
    </div>
  )
}

export function WarehouseCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Warehouse"
      backHref={backHref}
      dirtyMessage="You have unsaved warehouse changes. Leave this form without saving?"
    >
      {(page) => <WarehouseCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
