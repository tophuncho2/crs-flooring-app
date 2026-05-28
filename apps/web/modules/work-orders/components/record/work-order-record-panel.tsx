"use client"

import { useCallback, useState } from "react"
import { RecordMultiSectionPanel } from "@/components/panels/record-multi-section-panel"
import { RecordPrimarySectionInstance } from "@/components/sections/panels/record-primary-section-instance"
import type { RecordSectionSubHeaderAction } from "@/components/sections/structure/record-section-sub-header"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import type {
  InventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { useWorkOrderPrimarySection } from "@/modules/work-orders/controllers/record/primary/use-work-order-primary-section"
import type { CutLogPanelPatch } from "@/modules/cut-logs"
import type { PropertyHubSaveResult } from "@/modules/properties/controllers/property-hub-side-panel"
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"
import { workOrderPrimarySectionActions } from "./primary/toolbar-controls/work-order-primary-section-actions"
import { WorkOrderMaterialItemsSection } from "./material-items/work-order-material-items-section"
import { WorkOrderRecordFooter } from "./footer"

export function WorkOrderRecordPanel({
  page,
  entry,
  initialMaterialItems,
  initialCutLogsByWorkOrderItemId,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialCutLogsByWorkOrderItemId: Record<string, InventoryAdjustmentRow[]>
}) {
  const controller = useWorkOrderPrimarySection({ page, entry })
  const [materialItems, setMaterialItems] = useState(initialMaterialItems)
  const [cutLogsByWorkOrderItemId, setCutLogsByWorkOrderItemId] = useState(
    initialCutLogsByWorkOrderItemId,
  )

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

  const handleHubEntitySaved = useCallback(
    (result: PropertyHubSaveResult) => {
      const current = controller.record
      if (!current) return
      if (result.kind === "mc") {
        if (current.managementCompanyId !== result.managementCompany.id) return
        controller.patchRecord({ managementCompanyName: result.managementCompany.name })
        return
      }
      if (current.propertyId !== result.property.id) return
      const property = result.property
      controller.patchRecord({
        propertyName: property.name,
        propertyStreetAddress: property.streetAddress,
        propertyCity: property.city,
        propertyState: property.state,
        propertyPostalCode: property.zip,
        propertyInstructions: property.instructions,
        managementCompanyId: property.managementCompany?.id ?? null,
        managementCompanyName: property.managementCompany?.name ?? null,
      })
    },
    [controller],
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
                  onHubEntitySaved={handleHubEntitySaved}
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
        ]}
      />
      <WorkOrderRecordFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
      />
    </>
  )
}
