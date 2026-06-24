import { toDateInputValue } from "../../shared/date-format.js"
import type { WorkOrderDetail, WorkOrderForm } from "./types.js"

export function validateWorkOrderForm(input: WorkOrderForm) {
  // Property is optional — a work order always has an auto-generated number,
  // so a record is never empty even with no fields set.
  // Vacancy is optional — `""` (nothing chosen) is a valid resting state.
  if (input.timeOfDay !== "" && input.timeOfDay !== "AM" && input.timeOfDay !== "PM") {
    return "Time of day must be AM or PM"
  }
  return ""
}

export function toWorkOrderForm(workOrder: WorkOrderDetail): WorkOrderForm {
  return {
    color: workOrder.color,
    propertyId: workOrder.propertyId ?? "",
    jobTypeId: workOrder.jobTypeId ?? "",
    templateId: workOrder.templateId ?? "",
    warehouseId: workOrder.warehouseId ?? "",
    unitNumber: workOrder.unitNumber,
    unitType: workOrder.unitType,
    customAddress: workOrder.customAddress,
    description: workOrder.description,
    internalNotes: workOrder.internalNotes,
    installerInstructions: workOrder.installerInstructions,
    scheduledFor: toDateInputValue(workOrder.scheduledFor),
    vacancy: workOrder.vacancy ?? "",
    timeOfDay: workOrder.timeOfDay ?? "",
  }
}
