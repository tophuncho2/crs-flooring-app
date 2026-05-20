"use client"

import { useCallback } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import type { InventoryDetail, InventoryForm } from "@builders/domain"
import { CutLogEditPanel, useCutLogEditPanel } from "@/modules/cut-logs"
import { useInventoryPrimarySection } from "../../controllers/record/primary/use-inventory-primary-section"
import { INVENTORY_CUT_LOGS_QUERY_KEY } from "../../data/inventory-cut-logs-request"
import { InventoryPrimaryFieldsSection } from "./sections/inventory-primary-fields-section"
import { InventoryCutLogsSection } from "./cut-logs/inventory-cut-logs-section"
import { InventoryRecordFooter } from "./footer"

export function InventoryRecordPanel({
  page,
  inventory,
}: {
  page: RecordDetailClientScaffoldContext
  inventory: InventoryDetail
}) {
  const controller = useInventoryPrimarySection({
    page,
    inventory,
  })

  // The cut-log section fetches its own paginated page via react-query
  // (`/api/inventory/[id]/cut-logs`). After any cut-log mutation, the
  // shared edit panel calls `publish`, which invalidates the section's
  // query so the visible page refetches with fresh data.
  const queryClient = useQueryClient()
  const publishCutLogPatch = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...INVENTORY_CUT_LOGS_QUERY_KEY, inventory.id],
    })
  }, [queryClient, inventory.id])

  const cutLogPanel = useCutLogEditPanel({
    scope: { kind: "inventory", inventoryId: inventory.id },
    canCreate: false,
    publish: publishCutLogPatch,
  })

  const stockUnitAbbrev = controller.record.stockUnitAbbrev ?? ""
  const coverageUnitAbbrev = controller.record.itemCoverageUnitAbbrev ?? ""

  return (
    <>
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
                  warehouseName={controller.record.warehouseName}
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
                inventoryId={inventory.id}
                stockUnitAbbrev={stockUnitAbbrev}
                coverageUnitAbbrev={coverageUnitAbbrev}
                onRowClick={(cutLog) =>
                  cutLogPanel.openPanel({
                    mode: "edit",
                    workOrderItemId: cutLog.workOrderItemId,
                    cutLog,
                  })
                }
              />
            ),
          },
        ]}
      />
      <InventoryRecordFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
      />
      <CutLogEditPanel controller={cutLogPanel} />
    </>
  )
}
