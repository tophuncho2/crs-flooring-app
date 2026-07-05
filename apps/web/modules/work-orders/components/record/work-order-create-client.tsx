"use client"

import { buildRecordDetailHref } from "@/hooks/navigation"
import { createWorkOrderRequest } from "@/modules/work-orders/data/mutations"
import {
  RecordCreateClientScaffold,
  RecordSingleSectionPanel,
  useSingleSectionCreateController,
  type RecordDetailClientScaffoldContext,
} from "@/engines/record-view"
import { EMPTY_WORK_ORDER_FORM, type WorkOrderForm } from "@builders/domain"
import { createRecordSectionError } from "@/types/record/section-error"
import {
  toUpdateWorkOrderInput,
  validateWorkOrderPrimaryForm,
} from "@/modules/work-orders/controllers/record/drafts"
import { WorkOrderPrimaryFieldsSection } from "./primary/work-order-primary-fields-section"
import { WorkOrderRecordFooter } from "./footer"

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
      // Gate on the shared form validator first (e.g. time-of-day shape) so the
      // user sees an inline message instead of a server 400. The server
      // validator still enforces the field rules as the source of truth.
      const validationError = validateWorkOrderPrimaryForm(localValue)
      if (validationError) {
        throw createRecordSectionError({
          kind: "validation",
          message: validationError,
          retryable: true,
        })
      }
      // Cast the partial-update shape to the create input shape.
      const updateInput = toUpdateWorkOrderInput(localValue)
      const payload = await createWorkOrderRequest({
        color: localValue.color,
        propertyId: localValue.propertyId || null,
        warehouseId: localValue.warehouseId,
        templateId: updateInput.templateId ?? null,
        jobTypeId: updateInput.jobTypeId ?? null,
        unitNumber: updateInput.unitNumber,
        unitType: updateInput.unitType,
        streetAddress: updateInput.streetAddress,
        city: updateInput.city,
        state: updateInput.state,
        postalCode: updateInput.postalCode,
        customerName: updateInput.customerName,
        description: updateInput.description,
        installer: updateInput.installer,
        internalNotes: updateInput.internalNotes,
        installerInstructions: updateInput.installerInstructions,
        purchaseOrderNumber: updateInput.purchaseOrderNumber,
        scheduledFor: updateInput.scheduledFor,
        vacancy: updateInput.vacancy ?? null,
        timeOfDay: updateInput.timeOfDay ?? null,
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
        saveLabel="Create"
        savingLabel="Creating..."
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
          onFieldsChange={(patch) => {
            controller.primarySection.setLocalValue((previous) => ({
              ...previous,
              ...patch,
            }))
          }}
        />
      </RecordSingleSectionPanel>
      <WorkOrderRecordFooter onClose={page.closePage} />
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
