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
  Payment,
  WorkOrderDetail,
  WorkOrderEntityInvolvementRow,
  WorkOrderMaterialItemRow,
  WorkOrderPlannedPaymentRow,
} from "@builders/domain"
import { useWorkOrderPrimarySection } from "@/modules/work-orders/controllers/record/primary/use-work-order-primary-section"
import { useWorkOrderMaterialItemsSection } from "@/modules/work-orders/controllers/record/material-items/use-work-order-material-items-section"
import { useWorkOrderPlannedPaymentsSection } from "@/modules/work-orders/controllers/record/planned-payments/use-work-order-planned-payments-section"
import { useWorkOrderEntityInvolvementSection } from "@/modules/work-orders/controllers/record/entity-involvement/use-work-order-entity-involvement-section"
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"
import { workOrderPrimarySectionActions } from "./primary/toolbar-controls/work-order-primary-section-actions"
import { WorkOrderMaterialItemsSection } from "./material-items/work-order-material-items-section"
import { WorkOrderPlannedPaymentsSection } from "./planned-payments/work-order-planned-payments-section"
import { WorkOrderEntityInvolvementSection } from "./entity-involvement/work-order-entity-involvement-section"
import { WorkOrderPaymentsSection } from "./payments/work-order-payments-section"
import { WorkOrderRecordFooter } from "./footer"

export function WorkOrderRecordPanel({
  page,
  entry,
  initialMaterialItems,
  initialAdjustmentsForWorkOrder,
  initialPlannedPayments,
  initialEntityInvolvements,
  initialPayments,
  printCounts,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialAdjustmentsForWorkOrder: EnrichedInventoryAdjustmentRow[]
  initialPlannedPayments: WorkOrderPlannedPaymentRow[]
  initialEntityInvolvements: WorkOrderEntityInvolvementRow[]
  initialPayments: Payment[]
  /** Per-doc-type print counts for this WO (read-only, shown in the primary section). */
  printCounts: ReadonlyArray<{ documentTypeName: string; count: number }>
}) {
  const controller = useWorkOrderPrimarySection({ page, entry })
  const [materialItems, setMaterialItems] = useState(initialMaterialItems)
  const [plannedPayments, setPlannedPayments] = useState(initialPlannedPayments)
  const [entityInvolvements, setEntityInvolvements] = useState(initialEntityInvolvements)
  // Read-only adjustments display snapshot, read straight from server props (NOT
  // frozen in state). Adjustments are created in-place via the modal, then
  // `router.refresh()` re-runs the loader — so the fresh enriched set flows back
  // in through this prop and the Adjustments grid re-groups. Editing an existing
  // adjustment happens on the inventory record view; returning here reloads fresh.
  const adjustmentsForWorkOrder = initialAdjustmentsForWorkOrder
  // Read-only payments snapshot, same server-prop-direct contract as adjustments
  // (NOT frozen in state): the Payments section creates via a modal and deletes
  // via a row menu, then `router.refresh()` re-runs the loader so the fresh set
  // flows back through this prop. Editing a payment happens on its own record view.
  const payments = initialPayments

  // Lifted to the panel so its dirty state registers with the multi-section
  // close-guard (matches the primary slot + the templates planned-products precedent).
  const materialItemsSection = useWorkOrderMaterialItemsSection({
    workOrder: controller.record,
    materialItems,
    publishMaterialItems: setMaterialItems,
    publishWorkOrder: controller.publishRecord,
  })

  // Lifted to the panel (like materialItemsSection) so its dirty state registers
  // with the multi-section close-guard. Standalone 3rd section — no toggle yet.
  const plannedPaymentsSection = useWorkOrderPlannedPaymentsSection({
    workOrder: controller.record,
    plannedPayments,
    publishPlannedPayments: setPlannedPayments,
    publishWorkOrder: controller.publishRecord,
  })

  // Lifted to the panel (like plannedPaymentsSection) so its dirty state registers
  // with the multi-section close-guard. Standalone section — no toggle.
  const entityInvolvementSection = useWorkOrderEntityInvolvementSection({
    workOrder: controller.record,
    entityInvolvements,
    publishEntityInvolvements: setEntityInvolvements,
    publishWorkOrder: controller.publishRecord,
  })

  const primaryActions = workOrderPrimarySectionActions({
    onSave: () => void controller.primarySection.save(),
    onDiscard: controller.primarySection.discard,
  })

  // One on-demand print view — the configurator (replaced the retired
  // file-generation worker). The document type is chosen inside the
  // configurator's label selector, so a single entry button suffices.
  const workOrderId = controller.record.id
  const printActions: RecordSectionSubHeaderAction[] = [
    {
      key: "print",
      label: "Export",
      tone: "neutral",
      onClick: () => {
        if (typeof window !== "undefined") {
          window.open(`/print/work-orders/${workOrderId}`, "_blank", "noopener,noreferrer")
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
                  printCounts={printCounts}
                  detail={{
                    workOrderNumber: controller.record.workOrderNumber,
                    propertyId: controller.record.propertyId,
                    propertyName: controller.record.propertyName,
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
                    createdBy: controller.record.createdBy,
                    updatedBy: controller.record.updatedBy,
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
          {
            key: "planned-payments",
            type: "item",
            order: 20,
            dirtyLabel: "planned payments",
            controller: plannedPaymentsSection,
            render: () => (
              // key on the WO id so stepping ◀/▶ to a neighbor remounts + resets
              // the section, matching the material-items slot above.
              <WorkOrderPlannedPaymentsSection
                key={controller.record.id}
                section={plannedPaymentsSection}
                workOrder={controller.record}
              />
            ),
          },
          {
            // Read-only Payments section — no controller (nothing to save, so it
            // never joins the close-guard). Server-prop-direct like Adjustments.
            key: "payments",
            type: "item",
            order: 30,
            render: () => (
              <WorkOrderPaymentsSection
                key={controller.record.id}
                workOrder={controller.record}
                payments={payments}
              />
            ),
          },
          {
            key: "entity-involvement",
            type: "item",
            order: 15,
            dirtyLabel: "entity involvement",
            controller: entityInvolvementSection,
            render: () => (
              // key on the WO id so stepping ◀/▶ to a neighbor remounts + resets
              // the section, matching the sibling editable slots above.
              <WorkOrderEntityInvolvementSection
                key={controller.record.id}
                section={entityInvolvementSection}
                workOrder={controller.record}
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
