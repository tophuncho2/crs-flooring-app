export type PricingLine = {
  quantity: number
  unitPrice: number
}

export function calculateTemplateTotal(lines: PricingLine[]) {
  return lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0)
}

export function snapshotTemplateLinesToWorkOrderLines<T extends PricingLine>(lines: T[]) {
  return lines.map((line) => ({
    ...line,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
  }))
}
