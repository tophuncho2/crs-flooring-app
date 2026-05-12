"use client"

import { useCallback, useMemo, useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
} from "@/modules/shared/engines/record-view"
import { buildDeleteConfirmationMessage } from "@/modules/shared/engines/common/feedback/confirm-delete"
import type {
  InventoryCutLogRow,
  InventoryDetail,
  InventoryForm,
} from "@builders/domain"
import {
  CutLogEditPanel,
  useCutLogEditPanel,
  type CutLogPanelPatch,
} from "@/modules/cut-logs"
import { useInventoryPrimarySection } from "../../controllers/use-inventory-primary-section"
import { InventoryPrimaryFieldsSection } from "./sections/inventory-primary-fields-section"
import { InventoryCutLogsSection } from "./cut-logs/inventory-cut-logs-section"

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

  // Local cut-log state — the SSR loader hands us the full snapshot;
  // every panel mutation patches this array in place so the section
  // stays in sync without a refetch. Mirrors the WO record panel's
  // `cutLogsByWorkOrderItemId` snapshot, just keyed flat.
  const [cutLogs, setCutLogs] = useState<InventoryCutLogRow[]>(inventory.cutLogs)

  // `InventoryCutLogRow` extends `CutLogRow` with server-resolved
  // `workOrderNumber` + `workOrderItemProductLabel`. The shared panel
  // returns the base `CutLogRow` shape on mutation success. We preserve
  // the existing labels when patching an existing row (decorative
  // columns; only a re-link or void can stale them) and default to null
  // for newly inserted rows.
  const publishCutLogPatch = useCallback((patch: CutLogPanelPatch) => {
    setCutLogs((current) => {
      if (patch.kind === "delete") {
        return current.filter((row) => row.id !== patch.cutLogId)
      }
      const idx = current.findIndex((row) => row.id === patch.cutLog.id)
      const labels =
        idx >= 0
          ? {
              workOrderNumber: current[idx]!.workOrderNumber,
              workOrderItemProductLabel: current[idx]!.workOrderItemProductLabel,
            }
          : { workOrderNumber: null, workOrderItemProductLabel: null }
      const merged: InventoryCutLogRow = {
        ...patch.cutLog,
        // Void clears the link cols server-side; surface the resulting
        // label gap immediately so the row reads honestly post-void.
        workOrderNumber:
          patch.cutLog.workOrderId === null ? null : labels.workOrderNumber,
        workOrderItemProductLabel:
          patch.cutLog.workOrderItemId === null
            ? null
            : labels.workOrderItemProductLabel,
      }
      return idx >= 0
        ? current.map((row, i) => (i === idx ? merged : row))
        : [...current, merged]
    })
  }, [])

  const cutLogPanel = useCutLogEditPanel({
    scope: { kind: "inventory", inventoryId: inventory.id },
    canCreate: false,
    publish: publishCutLogPatch,
  })

  // Sort cut logs for display: PENDING first (insertion-order, matches
  // SSR createdAt-asc), then FINAL / VOID ordered by `finalCutSequence`.
  const sortedCutLogs = useMemo(() => {
    const pending = cutLogs.filter(
      (row) => row.status === "PENDING" || (row.status === "QUEUED" && !row.isFinal),
    )
    const sequenced = cutLogs
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
  }, [cutLogs])

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
                rows={sortedCutLogs}
                stockUnitAbbrev={stockUnitAbbrev}
                coverageUnitAbbrev={coverageUnitAbbrev}
                totalCutSum={controller.record.totalCutSum}
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
        footer={{
          deleteLabel: "Delete Inventory",
          deleteConfirmMessage: buildDeleteConfirmationMessage("inventory row"),
          onDelete: () => void controller.deleteRecord(),
        }}
      />
      <CutLogEditPanel controller={cutLogPanel} />
    </>
  )
}
