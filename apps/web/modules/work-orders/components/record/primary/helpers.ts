import type { PropertyJoinedFields } from "@/modules/shared/property-fields"
import type { WorkOrderPrimaryDetail } from "./types"

export const VACANCY_OPTIONS = [
  { value: "VACANT", label: "Vacant" },
  { value: "OCCUPIED", label: "Occupied" },
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
