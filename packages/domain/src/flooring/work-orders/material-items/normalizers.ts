import type {
  WorkOrderItemStatus,
  WorkOrderMaterialItemRow,
} from "./types.js"

type WorkOrderMaterialItemInput = {
  id: string
  productId: string
  product: { name: string }
  quantity: { toString(): string } | null
  sendUnitName: string | null
  sendUnitAbbrev: string | null
  notes: string | null
  status: WorkOrderItemStatus
  sourceTemplateItemId: string | null
  createdAt: Date | string
}

export function normalizeWorkOrderMaterialItem(
  item: WorkOrderMaterialItemInput,
): WorkOrderMaterialItemRow {
  return {
    id: item.id,
    productId: item.productId,
    productName: item.product.name,
    quantity: item.quantity == null ? "" : item.quantity.toString(),
    sendUnitName: item.sendUnitName ?? "",
    sendUnitAbbrev: item.sendUnitAbbrev ?? "",
    notes: item.notes ?? "",
    status: item.status,
    sourceTemplateItemId: item.sourceTemplateItemId,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  }
}

