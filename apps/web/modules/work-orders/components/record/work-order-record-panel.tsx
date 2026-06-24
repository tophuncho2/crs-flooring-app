"use client"

import { useState } from "react"
import {
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordSectionSubHeaderAction,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import type {
  EnrichedInventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { useWorkOrderPrimarySection } from "@/modules/work-orders/controllers/record/primary/use-work-order-primary-section"
import { useWorkOrderMaterialItemsSection } from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"
import { workOrderPrimarySectionActions } from "./primary/toolbar-controls/work-order-primary-section-actions"
import { WorkOrderMaterialItemsSection } from "./material-items/work-order-material-items-section"
import { WorkOrderRecordFooter } from "./footer"

export function WorkOrderRecordPanel({
  page,
  entry,
  initialMaterialItems,
  initialAdjustmentsForWorkOrder,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialAdjustmentsForWorkOrder: EnrichedInventoryAdjustmentRow[]
}) {
  const controller = useWorkOrderPrimarySection({ page, entry })
  const [materialItems, setMaterialItems] = useState(initialMaterialItems)
  // Read-only adjustments display snapshot, read straight from server props (NOT
  // frozen in state). Adjustments are created in-place via the modal, then
  // `router.refresh()` re-runs the loader — so the fresh enriched set flows back
  // in through this prop and the Adjustments grid re-groups. Editing an existing
  // adjustment happens on the inventory record view; returning here reloads fresh.
  const adjustmentsForWorkOrder = initialAdjustmentsForWorkOrder

  // Lifted to the panel so its dirty state registers with the multi-section
  // close-guard (matches the primary slot + the templates material-items precedent).
  const materialItemsSection = useWorkOrderMaterialItemsSection({
    workOrder: controller.record,
    materialItems,
    publishMaterialItems: setMaterialItems,
    publishWorkOrder: controller.publishRecord,
  })

  const primaryActions = workOrderPrimarySectionActions({
    onSave: () => void controller.primarySection.save(),
    onDiscard: controller.primarySection.discard,
  })

  // On-demand print views (replaced the retired file-generation worker).
  const workOrderId = controller.record.id
  const printActions: RecordSectionSubHeaderAction[] = [
    {
      key: "print-picking-ticket",
      label: "Picking Ticket",
      tone: "neutral",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.open(
            `/print/work-orders/${workOrderId}/picking-ticket`,
            "_blank",
            "noopener,noreferrer",
          )
        }
      },
    },
    {
      key: "print-slip",
      label: "Work Order Slip",
      tone: "neutral",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.open(`/print/work-orders/${workOrderId}/slip`, "_blank", "noopener,noreferrer")
        }
      },
    },
    {
      key: "print-plan-file",
      label: "Plan File",
      tone: "neutral",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.open(
            `/print/work-orders/${workOrderId}/plan-file`,
            "_blank",
            "noopener,noreferrer",
          )
        }
      },
    },
  ]

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
                title="Work Order Details"
                error={controller.primarySection.error}
                noticeMessage={controller.primarySection.noticeMessage}
                noticeError={controller.primarySection.noticeError}
                isDirty={controller.primarySection.isDirty}
                isSaving={controller.primarySection.isSaving}
                hasConflict={controller.primarySection.hasConflict}
                onSave={primaryActions.onSave}
                onDiscard={primaryActions.onDiscard}
                saveLabel={primaryActions.saveLabel}
                savingLabel={primaryActions.savingLabel}
                showHeader={false}
                actions={printActions}
              >
                <WorkOrderPrimaryFieldsSection
                  draft={controller.primarySection.localValue}
                  detail={{
                    workOrderNumber: controller.record.workOrderNumber,
                    propertyId: controller.record.propertyId,
                    propertyName: controller.record.propertyName,
                    propertyStreetAddress: controller.record.propertyStreetAddress,
                    propertyCity: controller.record.propertyCity,
                    propertyState: controller.record.propertyState,
                    propertyPostalCode: controller.record.propertyPostalCode,
                    propertyInstructions: controller.record.propertyInstructions,
                    entityId: controller.record.entityId,
                    entityName: controller.record.entityName,
                    templateId: controller.record.templateId,
                    templateUnitType: controller.record.unitType,
                    jobTypeId: controller.record.jobTypeId,
                    jobTypeName: controller.record.jobTypeName,
                    warehouseId: controller.record.warehouseId,
                    warehouseName: controller.record.warehouseName,
                    createdAt: controller.record.createdAt,
                    updatedAt: controller.record.updatedAt,
                  }}
                  disabled={controller.primarySection.isSaving}
                  onFieldChange={(field, value) => {
                    controller.primarySection.setLocalValue((previous) => ({
                      ...previous,
                      [field]: value,
                    }))
                  }}
                  onFieldsChange={(patch) => {
                    controller.primarySection.setLocalValue((previous) => ({
                      ...previous,
                      ...patch,
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
            dirtyLabel: "material items",
            controller: materialItemsSection,
            render: () => (
              // key on the WO id so stepping ◀/▶ to a neighbor remounts the
              // section — resetting its local Adjustments/Requested mode toggle
              // rather than carrying the prior WO's view across the step.
              <WorkOrderMaterialItemsSection
                key={controller.record.id}
                workOrder={controller.record}
                adjustmentsForWorkOrder={adjustmentsForWorkOrder}
                materialItems={materialItems}
                section={materialItemsSection}
              />
            ),
          },
        ]}
      />
      <WorkOrderRecordFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
      />
    </>
  )
}
