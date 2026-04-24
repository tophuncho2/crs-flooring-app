import type { WorkOrderDetail, WorkOrderForm } from "./types.js"

export function validateWorkOrderForm(input: WorkOrderForm) {
  if (!input.propertyId) return "Property is required"
  if (input.vacancy !== "" && input.vacancy !== "VACANT" && input.vacancy !== "OCCUPIED") {
    return "Vacancy status must be VACANT or OCCUPIED"
  }
  return ""
}

export function toWorkOrderForm(workOrder: WorkOrderDetail): WorkOrderForm {
  return {
    propertyId: workOrder.propertyId,
    managementCompanyId: workOrder.managementCompanyId ?? "",
    jobTypeId: workOrder.jobTypeId ?? "",
    templateId: workOrder.templateId ?? "",
    warehouseId: workOrder.warehouseId ?? "",
    unitNumber: workOrder.unitNumber,
    unitType: workOrder.unitType,
    customAddress: workOrder.customAddress,
    description: workOrder.description,
    instructions: workOrder.instructions,
    propertyInstructions: workOrder.propertyInstructions,
    notes: workOrder.notes,
    scheduledFor: workOrder.scheduledFor,
    isComplete: workOrder.isComplete,
    vacancy: workOrder.vacancy ?? "",
  }
}
