export function toAllocationNumber(value: string | number | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toAllocationDateValue(value: string | Date | null | undefined) {
  if (value instanceof Date) {
    return value
  }

  const parsed = new Date(value ?? "")
  if (Number.isNaN(parsed.getTime())) {
    return new Date(0)
  }

  return parsed
}
