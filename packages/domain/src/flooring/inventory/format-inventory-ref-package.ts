export type InventoryRefPackageInput = {
  inventoryNumber: string
  itemNumber?: string | null
  dyeLot?: string | null
  notes?: string | null
}

export function formatInventoryRefPackage(input: InventoryRefPackageInput): string {
  return [input.inventoryNumber, input.itemNumber, input.dyeLot, input.notes]
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)
    .join(" - ")
}
