"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import {
  EMPTY_INVENTORY_AGE_INDICATOR_FORM,
  type InventoryAgeIndicatorForm,
} from "@builders/domain"
import { createInventoryAgeIndicatorRequest } from "@/modules/inventory-age-indicators/data/mutations"
import { InventoryAgeIndicatorPrimaryFieldsSection } from "./primary/inventory-age-indicator-primary-fields-section"

function InventoryAgeIndicatorCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<InventoryAgeIndicatorForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_INVENTORY_AGE_INDICATOR_FORM }),
    createRecord: async (localValue) => {
      const { inventoryAgeIndicator } = await createInventoryAgeIndicatorRequest(localValue)
      return {
        redirectTo: buildRecordDetailHref(
          "/dashboard/inventory-age-indicators",
          inventoryAgeIndicator.id,
          backHref,
        ),
      }
    },
  })

  return (
    <RecordSingleSectionPanel
      title="Age Indicator Details"
      controller={controller}
      showHeader={false}
      saveLabel="Create"
      savingLabel="Creating..."
    >
      <InventoryAgeIndicatorPrimaryFieldsSection
        draft={controller.primarySection.localValue}
        editable={!controller.primarySection.isSaving}
        onDaysChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, days: value }))
        }
        onColorChange={(value) =>
          controller.primarySection.setLocalValue((previous) => ({ ...previous, color: value }))
        }
      />
    </RecordSingleSectionPanel>
  )
}

export function InventoryAgeIndicatorCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Age Indicator"
      backHref={backHref}
      dirtyMessage="You have unsaved age indicator changes. Leave this form without saving?"
    >
      {(page) => <InventoryAgeIndicatorCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
