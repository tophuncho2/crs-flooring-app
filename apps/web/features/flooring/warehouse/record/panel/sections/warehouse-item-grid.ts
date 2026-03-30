import type { RecordRowColumnSpec } from "@/features/shared/engines/record-view"

export const WAREHOUSE_SECTION_COLUMNS = [
  { key: "name", minWidth: 320, grow: 1.9 },
  { key: "locationsCount", minWidth: 176, grow: 0.7, align: "center" },
  { key: "toggle", minWidth: 120, grow: 0, align: "center" },
  { key: "remove", minWidth: 112, grow: 0, align: "end" },
] satisfies RecordRowColumnSpec[]

export const WAREHOUSE_LOCATION_COLUMNS = [
  { key: "locationCode", minWidth: 280, grow: 1.2 },
  { key: "remove", minWidth: 112, grow: 0, align: "end" },
] satisfies RecordRowColumnSpec[]
