export const IMPORT_TRANSPORT_TYPE_OPTIONS = [
  { value: "RETURN", label: "Return" },
  { value: "PURCHASE_ORDER", label: "Purchase Order" },
] as const

export const IMPORT_STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "FINAL", label: "Final" },
] as const

export function getImportStatusFieldClass(value: string) {
  return value === "FINAL"
    ? "border-emerald-300 bg-emerald-200 text-emerald-900"
    : "border-sky-300 bg-sky-200 text-sky-900"
}

export function getImportedStatusFieldClass(isImported: boolean) {
  return getImportStatusFieldClass(isImported ? "FINAL" : "PENDING")
}

export function getTransportTypeFieldClass(value: string) {
  return value === "RETURN"
    ? "border-stone-300 bg-stone-200 text-stone-900"
    : "border-violet-300 bg-violet-200 text-violet-900"
}
