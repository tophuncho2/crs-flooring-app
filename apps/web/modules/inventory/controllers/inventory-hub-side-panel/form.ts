import type { InventoryForm } from "@builders/domain"

export const EMPTY_INVENTORY_FORM: InventoryForm = {
  rollNumber: "",
  dyeLot: "",
  location: "",
  note: "",
  internalNotes: "",
  isArchived: false,
}

export function inventoryFormIsDirty(
  current: InventoryForm,
  baseline: InventoryForm,
): boolean {
  return (
    current.rollNumber !== baseline.rollNumber ||
    current.dyeLot !== baseline.dyeLot ||
    current.location !== baseline.location ||
    current.note !== baseline.note ||
    current.internalNotes !== baseline.internalNotes ||
    current.isArchived !== baseline.isArchived
  )
}
