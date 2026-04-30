"use client"

import { useMemo } from "react"
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
import { InventoryCutLogsSection } from "./cut-logs/inventory-cut-logs-section"
import { InventoryHistoricalCutLogsSection } from "./sections/inventory-historical-cut-logs-section"

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

  // Cut-log mutations live exclusively under the WO record view (per
  // sweep 4a/4b). Inventory record view shows the cut logs read-only,
  // partitioned the same way the editable surface used to:
  //   - Pending section: PENDING + QUEUED-from-PENDING (`!isFinal`)
  //   - Historical section: FINAL + VOID + QUEUED-from-FINAL (`isFinal`)
  // Cut logs come straight off the SSR-loaded record snapshot.
  const cutLogs = controller.record.cutLogs
  const pendingCutLogs = useMemo(
    () =>
      cutLogs.filter(
        (row) => row.status === "PENDING" || (row.status === "QUEUED" && !row.isFinal),
      ),
    [cutLogs],
  )
  const historicalCutLogs = useMemo(
    () =>
      cutLogs.filter(
        (row) =>
          row.status === "FINAL" ||
          row.status === "VOID" ||
          (row.status === "QUEUED" && row.isFinal),
      ),
    [cutLogs],
  )

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
              rows={pendingCutLogs}
              stockUnitAbbrev={controller.record.stockUnitAbbrev ?? ""}
              coverageUnitAbbrev={controller.record.itemCoverageUnitAbbrev ?? ""}
              totalCutSum={controller.record.totalCutSum}
            />
          ),
        },
        {
          key: "historical-cut-logs",
          type: "item",
          order: 20,
          render: () => (
            <InventoryHistoricalCutLogsSection
              rows={historicalCutLogs}
              stockUnitAbbrev={controller.record.stockUnitAbbrev ?? ""}
              coverageUnitAbbrev={controller.record.itemCoverageUnitAbbrev ?? ""}
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
