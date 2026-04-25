"use client"

import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import type {
  InventoryDetail,
  InventoryForm,
  InventoryLocationOption,
  InventoryWarehouseOption,
} from "@builders/domain"
import { useInventoryPrimarySection } from "../../controllers/use-inventory-primary-section"
import { InventoryPrimaryFieldsSection } from "./sections/inventory-primary-fields-section"
import { InventoryCutLogsSection } from "./sections/inventory-cut-logs-section"

export function InventoryRecordPanel({
  page,
  inventory,
  locationOptions,
  warehouseOptions,
}: {
  page: RecordDetailClientScaffoldContext
  inventory: InventoryDetail
  locationOptions: InventoryLocationOption[]
  warehouseOptions: InventoryWarehouseOption[]
}) {
  const controller = useInventoryPrimarySection({
    page,
    inventory,
    locationOptions,
  })

  return (
    <RecordMultiSectionPanel
      page={page}
      sections={[
        {
          key: "primary",
          type: "field",
          slot: "primary",
          order: 0,
          dirtyLabel: "primary",
          controller: controller.primarySection,
          render: () => (
            <RecordPrimarySectionInstance
              title="Inventory Details"
              error={controller.primarySection.error}
              noticeMessage={controller.primarySection.noticeMessage}
              noticeError={controller.primarySection.noticeError}
              isDirty={controller.primarySection.isDirty}
              isSaving={controller.primarySection.isSaving}
              hasConflict={controller.primarySection.hasConflict}
              onSave={() => void controller.primarySection.save()}
              onDiscard={controller.primarySection.discard}
              saveLabel="Save Inventory"
              savingLabel="Saving Inventory..."
              showHeader={false}
            >
              <InventoryPrimaryFieldsSection
                inventory={controller.record}
                draft={controller.primarySection.localValue}
                locationOptions={controller.availableLocationOptions}
                warehouseOptions={warehouseOptions}
                selectedLocation={controller.selectedLocation}
                disabled={controller.primarySection.isSaving}
                onFieldChange={(field, value) => {
                  controller.primarySection.setLocalValue((previous: InventoryForm) => ({
                    ...previous,
                    [field]: value,
                  }))
                }}
              />
            </RecordPrimarySectionInstance>
          ),
        },
        {
          key: "cut-logs",
          type: "item",
          order: 10,
          render: () => (
            <InventoryCutLogsSection
              cutLogs={controller.record.cutLogs}
              stockUnitAbbrev={controller.record.stockUnitAbbrev}
              totalCutSum={controller.record.totalCutSum}
              isArchived={controller.record.isArchived}
            />
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Inventory",
        deleteConfirmMessage: buildDeleteConfirmationMessage("inventory row"),
        onDelete: () => void controller.deleteRecord(),
      }}
    />
  )
}
