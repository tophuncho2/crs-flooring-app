import type { PropertyJoinedFields } from "@/engines/record-view"
import type { WorkOrderPrimaryDetail } from "./types"

export const VACANCY_OPTIONS = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
]

export const TIME_OF_DAY_OPTIONS = [
  { value: "AM", label: "AM" },
  { value: "PM", label: "PM" },
]

export function detailToPropertyJoined(
  detail: WorkOrderPrimaryDetail | null,
): PropertyJoinedFields | null {
  if (!detail) return null
  return {
    streetAddress: detail.propertyStreetAddress,
    city: detail.propertyCity,
    state: detail.propertyState,
    postalCode: detail.propertyPostalCode,
    instructions: detail.propertyInstructions,
  }
}
