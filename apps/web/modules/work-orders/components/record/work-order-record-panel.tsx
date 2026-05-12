"use client"

import { useCallback, useState } from "react"
import { RecordMultiSectionPanel } from "@/components/panels/record-multi-section-panel"
import { RecordPrimarySectionInstance } from "@/components/sections/panels/record-primary-section-instance"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import { buildDeleteConfirmationMessage } from "@/components/dialogs/confirm-delete"
import type {
  CutLogRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import type { WorkOrderFileRow } from "@/modules/work-orders/data/queries"
import { useWorkOrderPrimarySection } from "@/modules/work-orders/controllers/record/primary/use-work-order-primary-section"
import type { CutLogPanelPatch } from "@/modules/cut-logs"
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"
import { WorkOrderMaterialItemsSection } from "./material-items/work-order-material-items-section"
import { WorkOrderFilesSection } from "./files/work-order-files-section"

export function WorkOrderRecordPanel({
  page,
  entry,
  initialMaterialItems,
  initialCutLogsByWorkOrderItemId,
  initialFiles,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialCutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
  initialFiles: WorkOrderFileRow[]
}) {
  const controller = useWorkOrderPrimarySection({ page, entry })
  const [materialItems, setMaterialItems] = useState(initialMaterialItems)
  const [cutLogsByWorkOrderItemId, setCutLogsByWorkOrderItemId] = useState(
    initialCutLogsByWorkOrderItemId,
  )

  const publishCutLogPatch = useCallback((patch: CutLogPanelPatch) => {
    // WO-side patches always carry the WOMI id (callers open the panel
    // from within a WOMI row, and the controller threads it through to
    // every mutation). If somehow null arrives (e.g. an inv-side patch
    // routed here in error), skip — the cut log is no longer linked to
    // a WOMI on this WO so there's nothing to bucket.
    if (patch.workOrderItemId === null) return
    const womiId = patch.workOrderItemId
    setCutLogsByWorkOrderItemId((current) => {
      const existing = current[womiId] ?? []
      if (patch.kind === "delete") {
        const next = existing.filter((row) => row.id !== patch.cutLogId)
        return { ...current, [womiId]: next }
      }
      const idx = existing.findIndex((row) => row.id === patch.cutLog.id)
      const next = idx >= 0
        ? existing.map((row, i) => (i === idx ? patch.cutLog : row))
        : [...existing, patch.cutLog]
      return { ...current, [womiId]: next }
    })
  }, [])

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
              title="Work Order Details"
              error={controller.primarySection.error}
              noticeMessage={controller.primarySection.noticeMessage}
              noticeError={controller.primarySection.noticeError}
              isDirty={controller.primarySection.isDirty}
              isSaving={controller.primarySection.isSaving}
              hasConflict={controller.primarySection.hasConflict}
              onSave={() => void controller.primarySection.save()}
              onDiscard={controller.primarySection.discard}
              saveLabel="Save Work Order"
              savingLabel="Saving Work Order..."
              showHeader={false}
            >
              <WorkOrderPrimaryFieldsSection
                draft={controller.primarySection.localValue}
                workOrderNumber={controller.record.workOrderNumber}
                status={controller.record.status}
                detail={{
                  propertyId: controller.record.propertyId,
                  propertyName: controller.record.propertyName,
                  propertyStreetAddress: controller.record.propertyStreetAddress,
                  propertyCity: controller.record.propertyCity,
                  propertyState: controller.record.propertyState,
                  propertyPostalCode: controller.record.propertyPostalCode,
                  propertyInstructions: controller.record.propertyInstructions,
                  managementCompanyId: controller.record.managementCompanyId,
                  managementCompanyName: controller.record.managementCompanyName,
                  templateId: controller.record.templateId,
                  templateNumber: controller.record.templateNumber,
                  jobTypeId: controller.record.jobTypeId,
                  jobTypeName: controller.record.jobTypeName,
                  warehouseId: controller.record.warehouseId,
                  warehouseName: controller.record.warehouseName,
                }}
                disabled={controller.primarySection.isSaving}
                onFieldChange={(field, value) => {
                  controller.primarySection.setLocalValue((previous) => ({
                    ...previous,
                    [field]: value,
                  }))
                }}
              />
            </RecordPrimarySectionInstance>
          ),
        },
        {
          key: "material-items",
          type: "item",
          order: 10,
          render: () => (
            <WorkOrderMaterialItemsSection
              workOrder={controller.record}
              materialItems={materialItems}
              cutLogsByWorkOrderItemId={cutLogsByWorkOrderItemId}
              publishMaterialItems={setMaterialItems}
              publishWorkOrder={controller.publishRecord}
              publishCutLogPatch={publishCutLogPatch}
            />
          ),
        },
        {
          key: "files",
          type: "item",
          order: 20,
          render: () => (
            <WorkOrderFilesSection
              workOrderId={controller.record.id}
              initialFiles={initialFiles}
            />
          ),
        },
      ]}
      footer={{
        deleteLabel: "Delete Work Order",
        deleteConfirmMessage: buildDeleteConfirmationMessage("work order"),
        onDelete: () => void controller.deleteRecord(),
      }}
    />
  )
}
