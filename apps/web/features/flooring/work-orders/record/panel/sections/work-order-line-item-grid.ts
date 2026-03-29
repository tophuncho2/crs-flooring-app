import type { RecordRowColumnSpec } from "@/features/shared/engines/record-view"

export const WORK_ORDER_MATERIAL_COLUMNS = [
  { key: "product", minWidth: 320, grow: 2.25 },
  { key: "quantity", minWidth: 152, grow: 0.7, align: "center" },
  { key: "unitPrice", minWidth: 184, grow: 0.82 },
  { key: "total", minWidth: 160, grow: 0.72 },
  { key: "notes", minWidth: 224, grow: 1.15 },
  { key: "allocations", minWidth: 136, grow: 0.76, align: "center" },
  { key: "status", minWidth: 176, grow: 0.9, align: "center" },
  { key: "remove", minWidth: 112, grow: 0.52, align: "end" },
] satisfies RecordRowColumnSpec[]

export const WORK_ORDER_SERVICE_COLUMNS = [
  { key: "service", minWidth: 256, grow: 1.65 },
  { key: "name", minWidth: 256, grow: 1.65 },
  { key: "quantity", minWidth: 164, grow: 0.8, align: "center" },
  { key: "unitPrice", minWidth: 184, grow: 0.82 },
  { key: "total", minWidth: 160, grow: 0.72 },
  { key: "notes", minWidth: 224, grow: 1.1 },
  { key: "status", minWidth: 176, grow: 0.9, align: "center" },
  { key: "remove", minWidth: 112, grow: 0.52, align: "end" },
] satisfies RecordRowColumnSpec[]

export const WORK_ORDER_SALES_REP_COLUMNS = [
  { key: "salesRep", minWidth: 320, grow: 2.2 },
  { key: "percent", minWidth: 168, grow: 0.8, align: "center" },
  { key: "total", minWidth: 168, grow: 0.8, align: "end" },
  { key: "status", minWidth: 176, grow: 0.9, align: "center" },
  { key: "remove", minWidth: 112, grow: 0.52, align: "end" },
] satisfies RecordRowColumnSpec[]

export const WORK_ORDER_CALCULATION_COLUMNS = [
  { key: "calculation", minWidth: 288, grow: 2 },
  { key: "value", minWidth: 176, grow: 0.9, align: "end" },
] satisfies RecordRowColumnSpec[]
