import type { UpdateWorkOrderUseCaseInput } from "@builders/application"
import {
  validateWorkOrderForm as domainValidateWorkOrderForm,
  type WorkOrderDetail,
  type WorkOrderForm,
} from "@builders/domain"

export type WorkOrderRecordEntry = WorkOrderDetail

export type PropertyOption = {
  id: string
  label: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  instructions: string
}
export type WarehouseOption = { id: string; name: string }
export type JobTypeOption = { id: string; name: string }
export type ProductOption = {
  id: string
  label: string
  categoryId: string
  sendUnitAbbrev: string
  stockUnitAbbrev: string
}

export function validateWorkOrderPrimaryForm(input: WorkOrderForm): string {
  return domainValidateWorkOrderForm(input)
}

/**
 * Converts the local `WorkOrderForm` (string-only fields with empty
 * strings to mean "blank") into the wire shape the API + use case
 * expect. Maps `""` to `null` for nullable fields, parses
 * `scheduledFor` into a `Date | null`.
 */
export function toUpdateWorkOrderInput(form: WorkOrderForm): UpdateWorkOrderUseCaseInput {
  const scheduledFor = form.scheduledFor
    ? (() => {
        const parsed = new Date(form.scheduledFor)
        return Number.isNaN(parsed.getTime()) ? null : parsed
      })()
    : null

  return {
    color: form.color,
    propertyId: form.propertyId || null,
    warehouseId: form.warehouseId || null,
    templateId: form.templateId || null,
    jobTypeId: form.jobTypeId || null,
    unitNumber: form.unitNumber,
    unitType: form.unitType,
    streetAddress: form.streetAddress,
    city: form.city,
    state: form.state,
    postalCode: form.zip,
    description: form.description,
    internalNotes: form.internalNotes,
    installerInstructions: form.installerInstructions,
    purchaseOrderNumber: form.purchaseOrderNumber,
    scheduledFor,
    vacancy: form.vacancy === "" ? null : form.vacancy,
    timeOfDay: form.timeOfDay === "" ? null : form.timeOfDay,
  }
}
