import type { SegmentedChoiceOption } from "@/engines/record-view"

// Vacant = light green (success tone), Occupied = caution yellow (warning tone).
// Colour shows in the record/create form only — the list column stays plain text.
export const VACANCY_OPTIONS: ReadonlyArray<SegmentedChoiceOption> = [
  { value: "VACANT", label: "Vacant", tone: "success" },
  { value: "OCCUPIED", label: "Occupied", tone: "warning" },
]

// AM = light green (success tone), PM = caution yellow (warning tone) — same
// palette as vacancy. Optional field: colour shows in the record/create form
// only; the list column + print view stay plain text.
export const TIME_OF_DAY_OPTIONS: ReadonlyArray<SegmentedChoiceOption> = [
  { value: "AM", label: "AM", tone: "success" },
  { value: "PM", label: "PM", tone: "warning" },
]
