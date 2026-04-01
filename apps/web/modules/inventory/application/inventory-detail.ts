import { updateInventoryDetailRow } from "@/modules/inventory/data/api"

export async function updateInventoryDetailUseCase(id: string, body: Record<string, unknown>) {
  return updateInventoryDetailRow(undefined, id, body)
}
