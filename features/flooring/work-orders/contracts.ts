export const WORK_ORDER_STATUS_OPTIONS = [
  "BUILDING_ORDER",
  "PENDING_EXPORT",
  "CARPET_CLEANING",
  "SENT_OUT",
  "PENDING",
  "PULL_TEMPLATE",
  "MODIFY",
] as const

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  BUILDING_ORDER: "Building Order",
  PENDING_EXPORT: "Pending Export",
  CARPET_CLEANING: "Carpet Cleaning",
  SENT_OUT: "Sent Out",
  PENDING: "Pending Export",
  PULL_TEMPLATE: "Pull Template",
  MODIFY: "Modify",
}

export const VACANCY_OPTIONS = ["VACANT", "OCCUPIED"] as const
export const SYNC_TEMPLATE_MODES = ["overwrite", "append"] as const

export type SyncTemplateMode = (typeof SYNC_TEMPLATE_MODES)[number]

export const TEMPLATE_SYNC_POLICY = {
  headerFields: {
    propertyId: "must_match_existing_work_order",
    templateId: "set_on_successful_sync",
    warehouseId: "snapshot_from_template_on_sync",
    instructions: "snapshot_from_template_on_sync",
    status: "work_order_only",
    isComplete: "work_order_only",
    vacancy: "work_order_only",
    scheduledFor: "work_order_only",
    unitLabel: "work_order_only",
    unitType: "work_order_only",
    customAddress: "work_order_only",
    notes: "work_order_only",
    googleDriveSlip: "work_order_only",
    googleDocUrl: "work_order_only",
  },
  rowBehavior: {
    materialItems: "copied_from_template",
    serviceItems: "copied_from_template",
    overwrite: "replace_existing_work_order_rows",
    append: "only_add_missing_snapshot_rows",
  },
  derivedValueOwnership: {
    templateTotals: "backend_calculated_response",
    workOrderTotals: "backend_calculated_response",
    shortageFlag: "backend_calculated_response",
    completionState: "persisted_operational_db_field",
    analytics: "persisted_operational_db_field",
  },
} as const

export function getWorkOrderStatusLabel(input: {
  status: string
  isComplete: boolean
  hasShortage?: boolean
}) {
  if (input.isComplete) {
    return "Complete"
  }

  if (input.hasShortage) {
    return "Shortage"
  }

  return WORK_ORDER_STATUS_LABELS[input.status] ?? input.status
}

export function getWorkOrderStatusFieldClass(value: string) {
  if (value === "BUILDING_ORDER") return "border-amber-500/40 bg-amber-500/10 text-amber-700"
  if (value === "PENDING_EXPORT") return "border-sky-500/40 bg-sky-500/10 text-sky-700"
  if (value === "CARPET_CLEANING") return "border-violet-500/40 bg-violet-500/10 text-violet-700"
  if (value === "SENT_OUT") return "border-orange-500/40 bg-orange-500/10 text-orange-700"
  if (value === "SHORTAGE") return "border-rose-500/40 bg-rose-500/10 text-rose-700"
  return "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]"
}

export function getVacancyFieldClass(value: string) {
  if (value === "OCCUPIED") return "border-yellow-500/40 bg-yellow-500/10 text-yellow-700"
  if (value === "VACANT") return "border-lime-400/40 bg-lime-400/10 text-lime-700"
  return "border-[var(--panel-border)] bg-transparent text-[var(--foreground)]"
}
