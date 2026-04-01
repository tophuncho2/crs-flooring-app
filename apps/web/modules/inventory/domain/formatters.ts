export function parseInventoryDecimal(value: string) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export function toInventoryFixedString(value: number) {
  return value.toFixed(2)
}

export function formatInventoryImportNumber(value: string) {
  return value ? `IMP-${value.padStart(4, "0")}` : "-"
}

export function formatInventoryQuantity(value: string, unitLabel: string) {
  return `${value} ${unitLabel}`.trim()
}
