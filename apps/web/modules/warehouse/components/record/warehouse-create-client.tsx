"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_WAREHOUSE_FORM, type WarehouseForm } from "@builders/domain"
import { createWarehouseRequest } from "@/modules/warehouse/data/mutations"
import { WarehousePrimaryFieldsSection } from "./primary/warehouse-primary-fields-section"

function WarehouseCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<WarehouseForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_WAREHOUSE_FORM }),
    createRecord: async (localValue) => {
      const { warehouse } = await createWarehouseRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref("/dashboard/warehouse", warehouse.id, backHref),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Warehouse Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <WarehousePrimaryFieldsSection
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
