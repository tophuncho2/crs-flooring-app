"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import { createWorkOrderRequest } from "@/modules/work-orders/data/mutations"
import { RecordCreateClientScaffold } from "@/scaffolds/record-create-client-scaffold"
import { RecordPanelFooter } from "@/components/panels/record-panel-footer"
import { RecordSingleSectionPanel } from "@/components/sections/panels/record-single-section-panel"
import { useSingleSectionCreateController } from "@/controllers/record/use-single-section-create-controller"
import type { RecordDetailClientScaffoldContext } from "@/scaffolds/record-detail-client-scaffold"
import { EMPTY_WORK_ORDER_FORM, type WorkOrderForm } from "@builders/domain"
import { toUpdateWorkOrderInput } from "@/modules/work-orders/controllers/record/drafts"
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"

function WorkOrderCreatePanel({
  page,
  backHref,
}: {
  page: RecordDetailClientScaffoldContext
  backHref: string
}) {
  const controller = useSingleSectionCreateController<WorkOrderForm>({
    page,
    createInitialValue: () => ({ ...EMPTY_WORK_ORDER_FORM }),
    createRecord: async (localValue) => {
      // The create API requires propertyId + warehouseId; the form
      // validator catches missing required fields before submit. Cast
      // the partial-update shape to the create input shape — the
      // validator on the server enforces the required keys.
      const updateInput = toUpdateWorkOrderInput(localValue)
      const payload = await createWorkOrderRequest({
        propertyId: localValue.propertyId,
        warehouseId: localValue.warehouseId,
        templateId: updateInput.templateId ?? null,
        managementCompanyId: updateInput.managementCompanyId ?? null,
        jobTypeId: updateInput.jobTypeId ?? null,
        unitNumber: updateInput.unitNumber,
        unitType: updateInput.unitType,
        customAddress: updateInput.customAddress,
        description: updateInput.description,
        scheduledFor: updateInput.scheduledFor,
        isComplete: updateInput.isComplete,
        vacancy: updateInput.vacancy ?? null,
      })
      return {
        redirectTo: buildRecordDetailHref(
          "/dashboard/work-orders",
          payload.workOrder.id,
          backHref,
        ),
      }
    },
  })

  return (
    <div className="space-y-4">
      <RecordSingleSectionPanel
        title="Work Order Details"
        controller={controller}
        showHeader={false}
        saveLabel="Create Work Order"
        savingLabel="Creating Work Order..."
      >
        <WorkOrderPrimaryFieldsSection
          draft={controller.primarySection.localValue}
          detail={null}
          disabled={controller.primarySection.isSaving}
          onFieldChange={(field, value) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              [field]: value,
            }))
          }}
        />
      </RecordSingleSectionPanel>
      <RecordPanelFooter onClose={page.closePage} />
    </div>
  )
}

export function WorkOrderCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Work Order"
      backHref={backHref}
      dirtyMessage="You have unsaved work-order changes. Leave this form without saving?"
    >
      {(page) => <WorkOrderCreatePanel page={page} backHref={backHref} />}
    </RecordCreateClientScaffold>
  )
}
