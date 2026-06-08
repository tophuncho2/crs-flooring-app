import type { PropertyJoinedFields, SegmentedChoiceOption } from "@/engines/record-view"
import type { WorkOrderPrimaryDetail } from "./types"

// Vacant = light green (success tone), Occupied = caution yellow (warning tone).
// Colour shows in the record/create form only — the list column stays plain text.
export const VACANCY_OPTIONS: ReadonlyArray<SegmentedChoiceOption> = [
  { value: "VACANT", label: "Vacant", tone: "success" },
  { value: "OCCUPIED", label: "Occupied", tone: "warning" },
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
