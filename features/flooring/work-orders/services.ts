import type { PricingLine } from "@/features/flooring/templates/services"

export function calculateWorkOrderTotal(lines: PricingLine[]) {
  return lines.reduce((total, line) => total + line.quantity * line.unitPrice, 0)
}
