"use client"

import { useCallback, useState } from "react"
import { RecordMultiSectionPanel } from "@/components/panels/record-multi-section-panel"
import { RecordPrimarySectionInstance } from "@/components/sections/panels/record-primary-section-instance"
import type { RecordSectionSubHeaderAction } from "@/components/sections/structure/record-section-sub-header"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import type {
  EnrichedInventoryAdjustmentRow,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import { useWorkOrderPrimarySection } from "@/modules/work-orders/controllers/record/primary/use-work-order-primary-section"
import { InventoryHubProvider } from "@/modules/app-shell/components/inventory-hub-provider"
import type { AdjustmentPanelPatch } from "@/modules/adjustments"
import type { PropertyHubSaveResult } from "@/modules/properties/controllers/property-hub-side-panel"
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
  const [adjustmentsByWorkOrderItemId, setAdjustmentsByWorkOrderItemId] = useState(
    initialAdjustmentsByWorkOrderItemId,
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

  const publishAdjustmentPatch = useCallback((patch: AdjustmentPanelPatch) => {
    // WO-side patches always carry the WOMI id (callers open the panel
    // from within a WOMI row, and the controller threads it through to
    // every mutation). If somehow null arrives (e.g. an inv-side patch
    // routed here in error), skip — the adjustment is no longer linked to
    // a WOMI on this WO so there's nothing to bucket.
    if (patch.workOrderItemId === null) return
    const womiId = patch.workOrderItemId
    setAdjustmentsByWorkOrderItemId((current) => {
      const existing = current[womiId] ?? []
      if (patch.kind === "delete") {
        const next = existing.filter((row) => row.id !== patch.adjustmentId)
        return { ...current, [womiId]: next }
      }
      // Mutation responses are plain `InventoryAdjustmentRow`; the grid stores
      // enriched rows. Preserve the enriched-only fields (warehouseName /
      // workOrderNumber / WOMI labels) from the existing row on update, and
      // synthesize them from in-scope WO + WOMI data for a freshly-created row.
      const idx = existing.findIndex((row) => row.id === patch.adjustment.id)
      if (idx >= 0) {
        const merged: EnrichedInventoryAdjustmentRow = { ...existing[idx], ...patch.adjustment }
        return { ...current, [womiId]: existing.map((row, i) => (i === idx ? merged : row)) }
      }
      const womi = materialItems.find((mi) => mi.id === womiId)
      const created: EnrichedInventoryAdjustmentRow = {
        ...patch.adjustment,
        workOrderNumber: controller.record.workOrderNumber,
        workOrderItemProductLabel: womi?.productName ?? null,
        workOrderItemNotes: womi?.notes ?? null,
        warehouseName: controller.record.warehouseName ?? "",
      }
      return { ...current, [womiId]: [...existing, created] }
    })
  }, [materialItems, controller.record])

  return (
    <InventoryHubProvider publishAdjustmentPatch={publishAdjustmentPatch}>
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
                adjustmentsByWorkOrderItemId={adjustmentsByWorkOrderItemId}
                publishMaterialItems={setMaterialItems}
                publishWorkOrder={controller.publishRecord}
                publishAdjustmentPatch={publishAdjustmentPatch}
              />
            ),
          },
        ]}
      />
      <WorkOrderRecordFooter
        onClose={page.closePage}
        onDelete={controller.deleteRecord}
      />
    </InventoryHubProvider>
  )
}
