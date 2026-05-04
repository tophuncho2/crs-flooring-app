"use client"

import { useCallback, useState } from "react"
import { RecordMultiSectionPanel } from "@/components/panels/record-multi-section-panel"
import { RecordPrimarySectionInstance } from "@/components/sections/panels/record-primary-section-instance"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import { buildDeleteConfirmationMessage } from "@/components/dialogs/confirm-delete"
import type {
  CutLogRow,
  ProductPickerOption,
  WorkOrderDetail,
  WorkOrderMaterialItemRow,
} from "@builders/domain"
import type { WorkOrderFileRow, WorkOrderFormOptionSet } from "@/modules/work-orders/data/queries"
import { useWorkOrderPrimarySection } from "@/modules/work-orders/controllers/record/primary/use-work-order-primary-section"
import type { CutLogPanelPatch } from "@/modules/work-orders/controllers/record/material-items/use-cut-log-edit-panel"
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"
import { WorkOrderMaterialItemsSection } from "./material-items/work-order-material-items-section"
import { WorkOrderFilesSection } from "./files/work-order-files-section"

export function WorkOrderRecordPanel({
  page,
  entry,
  initialMaterialItems,
  initialCutLogsByWorkOrderItemId,
  initialFiles,
  initialProductPickerOptionsByItemId,
  options,
}: {
  page: RecordDetailClientScaffoldContext
  entry: WorkOrderDetail
  initialMaterialItems: WorkOrderMaterialItemRow[]
  initialCutLogsByWorkOrderItemId: Record<string, CutLogRow[]>
  initialFiles: WorkOrderFileRow[]
  initialProductPickerOptionsByItemId: Record<string, ProductPickerOption>
  options: WorkOrderFormOptionSet
}) {
  const controller = useWorkOrderPrimarySection({ page, entry })
  const [materialItems, setMaterialItems] = useState(initialMaterialItems)
  const [cutLogsByWorkOrderItemId, setCutLogsByWorkOrderItemId] = useState(
    initialCutLogsByWorkOrderItemId,
  )

  const publishCutLogPatch = useCallback((patch: CutLogPanelPatch) => {
    setCutLogsByWorkOrderItemId((current) => {
      const existing = current[patch.workOrderItemId] ?? []
      if (patch.kind === "delete") {
        const next = existing.filter((row) => row.id !== patch.cutLogId)
        return { ...current, [patch.workOrderItemId]: next }
      }
      const idx = existing.findIndex((row) => row.id === patch.cutLog.id)
      const next = idx >= 0
        ? existing.map((row, i) => (i === idx ? patch.cutLog : row))
        : [...existing, patch.cutLog]
      return { ...current, [patch.workOrderItemId]: next }
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
                propertyOptions={options.propertyOptions}
                warehouseOptions={options.warehouseOptions}
                jobTypeOptions={options.jobTypeOptions}
                managementCompanyOptions={options.managementCompanyOptions}
                templateOptions={options.templateOptions}
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
              productPickerOptionsByItemId={initialProductPickerOptionsByItemId}
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
