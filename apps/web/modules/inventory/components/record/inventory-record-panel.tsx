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
import { useInventoryHubSidePanel } from "../../controllers/inventory-hub-side-panel"
import { fetchInventoryBalances } from "../../data/inventory-balances-request"
import { INVENTORY_CUT_LOGS_QUERY_KEY } from "../../data/inventory-cut-logs-request"
import { InventoryPrimaryFieldsSection } from "./primary/inventory-primary-fields-section"
import { InventoryCutLogsSection } from "./cut-logs/inventory-cut-logs-section"
import { InventoryHubSidePanel } from "../side-panel/hub"
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
  // (`/api/inventory/[id]/cut-logs`). After any cut-log mutation the shared
  // edit panel calls `publish`, which (1) invalidates the section's query so
  // the visible page refetches with fresh rows, and (2) refetches the three
  // derived cells on the primary section (stock balance, total cut, coverage
  // balance) via `/api/inventory/[id]/balances` and merges them via
  // `patchRecord` — the rest of the cached record (and any in-flight draft)
  // is left untouched.
  const queryClient = useQueryClient()
  const publishCutLogPatch = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...INVENTORY_CUT_LOGS_QUERY_KEY, inventory.id],
    })
    void fetchInventoryBalances(inventory.id)
      .then((balances) => {
        controller.patchRecord(balances)
      })
      .catch(() => {
        // Inventory row gone (e.g. deleted in another tab) — swallow; the
        // record page will surface the not-found state on its next refresh.
      })
  }, [controller, inventory.id, queryClient])

  const cutLogPanel = useCutLogEditPanel({
    scope: { kind: "inventory", inventoryId: inventory.id },
    canCreate: false,
    publish: publishCutLogPatch,
  })

  // Right-anchored hub side panel: read-only cells + paginated cut-logs
  // on top, click-to-enter editing for either the inventory cells or a
  // cut-log row. Shares the cut-logs query cache + publishCutLogPatch
  // with the inline cut-logs section below, so a hub-driven mutation
  // refreshes both surfaces.
  const inventoryHubPanel = useInventoryHubSidePanel({
    inventory: controller.record as InventoryDetail,
    warehouseName: controller.record.warehouseName ?? null,
    publishCutLogPatch,
    onInventoryUpdated: (next) => controller.patchRecord(next),
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
                actions={[
                  {
                    key: "open-inventory-hub",
                    label: "Open hub",
                    tone: "neutral",
                    onClick: inventoryHubPanel.openForView,
                  },
                ]}
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
      <InventoryHubSidePanel controller={inventoryHubPanel} />
    </>
  )
}
