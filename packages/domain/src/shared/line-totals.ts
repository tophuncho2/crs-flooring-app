export type LineTotalInput = {
  quantity: string | number
  unitPrice: string | number
}

function toNumber(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateLineTotal(input: LineTotalInput) {
  return toNumber(input.quantity) * toNumber(input.unitPrice)
}

export function formatLineTotal(input: LineTotalInput) {
  return `$${calculateLineTotal(input).toFixed(2)}`
}

export function formatCurrencyValue(value: string | number) {
  return `$${toNumber(value).toFixed(2)}`
}

export function sumLineTotals(lines: LineTotalInput[]) {
  return lines.reduce((total, line) => total + calculateLineTotal(line), 0)
}
