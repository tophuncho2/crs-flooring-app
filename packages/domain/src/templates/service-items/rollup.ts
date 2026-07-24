import { sumTemplatePlannedProductLineTotals } from "../planned-products/math.js"
import { SERVICE_ITEM_TYPE_VALUES, type ServiceItemType } from "../../shared/service-item-type.js"

type ServiceItemRollupInput = {
  itemType: string
  quantity: string
  cost: string
}

// Per-item-type service-cost roll-up: sum the line totals (qty × cost — the same
// integer-cents math as every line total, so it agrees to the penny) of the saved
// service items, grouped by itemType. Returns one canonical money string per enum
// value ("0.00" when a type has no items). Untyped rows cannot exist — itemType is a
// required enum — so every item lands in exactly one bucket.
export function sumTemplateServiceItemLineTotalsByType(
  items: ServiceItemRollupInput[],
): Record<ServiceItemType, string> {
  const result = {} as Record<ServiceItemType, string>
  for (const type of SERVICE_ITEM_TYPE_VALUES) {
    const forType = items.filter((item) => item.itemType === type)
    result[type] = sumTemplatePlannedProductLineTotals(
      forType.map((item) => ({ quantity: item.quantity, cost: item.cost })),
    )
  }
  return result
}
