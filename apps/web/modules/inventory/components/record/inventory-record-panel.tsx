"use client"

import { useCallback, useMemo, useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import type {
  CutLogRow,
  InventoryDetail,
  InventoryForm,
  InventoryLocationOption,
  InventoryWarehouseOption,
} from "@builders/domain"
import { useInventoryPrimarySection } from "../../controllers/use-inventory-primary-section"
import { useInventoryCutLogsSection } from "../../controllers/use-inventory-cut-logs-section"
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

  // Local snapshot of cut-log rows so the cut-logs section's optimistic
  // diff-save can splice fresh rows in without round-tripping through
  // the page loader. Seeded from the controller's record (which mirrors
  // the page loader output) and updated by the pending section's
  // diff-save (`publishCutLogs`) and the parent-owned merge callback
  // for the finalize batch action.
  const [cutLogs, setCutLogs] = useState<CutLogRow[]>(controller.record.cutLogs)

  // Pending section sees PENDING + QUEUED-from-PENDING (`!isFinal`).
  // Historical section sees FINAL + VOID + QUEUED-from-FINAL (`isFinal`).
  // QUEUED rows live in their origin section until the worker resolves
  // them and a refresh reloads the new status.
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

  // Mark-for-finalize optimistic flip: the pending controller doesn't
  // know about historical rows. The parent owns the merge by flipping
  // status on the marked ids in-place against the full list.
  const handleMarkedForFinalize = useCallback((markedIds: string[]) => {
    const set = new Set(markedIds)
    setCutLogs((previous) =>
      previous.map((row) => (set.has(row.id) ? { ...row, status: "QUEUED" as const } : row)),
    )
  }, [])

  const cutLogsSection = useInventoryCutLogsSection({
    record: controller.record,
    cutLogs: pendingCutLogs,
    publishRecord: () => {
      // Cut-log mutations don't change the parent inventory record's
      // primary fields — `totalCutSum` updates async via the worker
      // and is read off the controller's record snapshot on next load.
      // Nothing to publish here today; placeholder lives so the section
      // controller's contract stays open for a future sweep.
    },
    publishCutLogs: setCutLogs,
    publishMarkedForFinalize: handleMarkedForFinalize,
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
          dirtyLabel: "cut logs",
          controller: cutLogsSection,
          render: () => (
            <InventoryCutLogsSection
              drafts={cutLogsSection.localValue}
              serverRows={pendingCutLogs}
              stockUnitAbbrev={controller.record.stockUnitAbbrev ?? ""}
              coverageUnitAbbrev={controller.record.itemCoverageUnitAbbrev ?? ""}
              totalCutSum={controller.record.totalCutSum}
              isDirty={cutLogsSection.isDirty}
              isSaving={cutLogsSection.isSaving}
              hasConflict={cutLogsSection.hasConflict}
              sectionError={cutLogsSection.error?.message ?? null}
              noticeMessage={cutLogsSection.noticeMessage}
              noticeError={cutLogsSection.noticeError}
              selectedIds={cutLogsSection.selectedIds}
              eligibleSelectedIds={cutLogsSection.eligibleSelectedIds}
              isFinalizing={cutLogsSection.isFinalizing}
              finalizeError={cutLogsSection.finalizeError}
              onSave={() => void cutLogsSection.save()}
              onDiscard={cutLogsSection.discard}
              onAddRow={cutLogsSection.addRow}
              onRowFieldChange={cutLogsSection.setRowField}
              onRemoveRow={cutLogsSection.removeRow}
              onToggleSelection={cutLogsSection.toggleSelection}
              onFinalizeSelected={() => void cutLogsSection.finalizeSelected()}
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
