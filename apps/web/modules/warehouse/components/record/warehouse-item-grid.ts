import type { RecordRowColumnSpec } from "@/modules/shared/engines/record-view"

export const WAREHOUSE_SECTION_COLUMNS = [
  { key: "number", minWidth: 240, grow: 1.6 },
  { key: "locationsCount", minWidth: 160, grow: 0.7, align: "center" },
  { key: "toggle", minWidth: 120, grow: 0, align: "center" },
  { key: "remove", minWidth: 112, grow: 0, align: "end" },
] satisfies RecordRowColumnSpec[]

export const WAREHOUSE_LOCATION_COLUMNS = [
  { key: "rafter", minWidth: 140, grow: 0.8 },
  { key: "level", minWidth: 140, grow: 0.8 },
  { key: "label", minWidth: 140, grow: 0.8 },
  { key: "remove", minWidth: 112, grow: 0, align: "end" },
] satisfies RecordRowColumnSpec[]
