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
} from "@builders/domain"
import { useInventoryPrimarySection } from "../../controllers/use-inventory-primary-section"
import { useInventoryCutLogViewPanel } from "../../controllers/use-inventory-cut-log-view-panel"
import { InventoryPrimaryFieldsSection } from "./sections/inventory-primary-fields-section"
import { InventoryCutLogsSection } from "./cut-logs/inventory-cut-logs-section"
import { InventoryCutLogViewPanel } from "./cut-logs/inventory-cut-log-view-panel"

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
  const cutLogViewPanel = useInventoryCutLogViewPanel()

  // Cut-log mutations live exclusively under the WO record view (per
  // sweep 4a/4b). Inventory record view shows the cut logs read-only as a
  // single grid: pending rows first (insertion-order, matches SSR
  // createdAt-asc), then FINAL/VOID rows ordered by `finalCutSequence`.
  // Row click opens the view-only side panel.
  const sortedCutLogs = useMemo(() => {
    const rows = controller.record.cutLogs
    const pending = rows.filter(
      (row) => row.status === "PENDING" || (row.status === "QUEUED" && !row.isFinal),
    )
    const sequenced = rows
      .filter(
        (row) =>
          row.status === "FINAL" ||
          row.status === "VOID" ||
          (row.status === "QUEUED" && row.isFinal),
      )
      .sort(
        (a, b) =>
          (a.finalCutSequence ?? Number.MAX_SAFE_INTEGER) -
          (b.finalCutSequence ?? Number.MAX_SAFE_INTEGER),
      )
    return [...pending, ...sequenced]
  }, [controller.record.cutLogs])

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
                  locationShortCode={controller.record.locationShortCode || null}
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
                rows={sortedCutLogs}
                stockUnitAbbrev={stockUnitAbbrev}
                coverageUnitAbbrev={coverageUnitAbbrev}
                totalCutSum={controller.record.totalCutSum}
                onRowClick={cutLogViewPanel.openPanel}
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
      <InventoryCutLogViewPanel controller={cutLogViewPanel} />
    </>
  )
}
