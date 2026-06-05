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
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"
import { workOrderPrimarySectionActions } from "./primary/toolbar-controls/work-order-primary-section-actions"
import { WorkOrderMaterialItemsSection } from "./material-items/work-order-material-items-section"
import { WorkOrderRecordFooter } from "./footer"

export function WorkOrderRecordPanel({
  page,
  entry,
  initialMaterialItems,
  initialAdjustmentsByWorkOrderItemId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialAdjustmentsByWorkOrderItemId: Record<string, EnrichedInventoryAdjustmentRow[]>
}) {
  const controller = useWorkOrderPrimarySection({ page, entry })
  const [materialItems, setMaterialItems] = useState(initialMaterialItems)
  // Read-only per-WOMI display snapshot. Adjustments are now created/edited on
  // the inventory record view; returning here reloads the work order fresh, so
  // there's no in-place patching to do.
  const [adjustmentsByWorkOrderItemId] = useState(initialAdjustmentsByWorkOrderItemId)

  const primaryActions = workOrderPrimarySectionActions({
    onSave: () => void controller.primarySection.save(),
    onDiscard: controller.primarySection.discard,
  })

  // On-demand print views (replaced the retired file-generation worker).
  const workOrderId = controller.record.id
  const printActions: RecordSectionSubHeaderAction[] = [
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
                    templateUnitType: controller.record.unitType,
                    jobTypeId: controller.record.jobTypeId,
                    jobTypeName: controller.record.jobTypeName,
                    statusId: controller.record.statusId,
                    statusName: controller.record.statusName,
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
            render: () => (
              <WorkOrderMaterialItemsSection
                workOrder={controller.record}
                materialItems={materialItems}
                adjustmentsByWorkOrderItemId={adjustmentsByWorkOrderItemId}
                publishMaterialItems={setMaterialItems}
                publishWorkOrder={controller.publishRecord}
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
