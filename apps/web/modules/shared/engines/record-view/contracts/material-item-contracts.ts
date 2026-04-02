import { isEditableDecimalInput } from "./child-item-validation"
import type { FieldErrorMap } from "../feedback/record-field-errors"

export type MaterialItemOption = {
  id: string
  label: string
  sendUnit: string
}

export type EditableMaterialItem = {
  id: string
  productId: string
  productName: string
  sendUnit: string
  quantity: string
  unitPrice: string
  notes: string
  updatedAt: string
}

export type MaterialItemDraft = {
  productId: string
  quantity: string
  unitPrice: string
  notes: string
}

export type MaterialItemField = "productId" | "quantity" | "unitPrice"
export type MaterialItemFieldErrors = FieldErrorMap<MaterialItemField>

export function validateMaterialItemFields(value: Pick<MaterialItemDraft, "productId" | "quantity" | "unitPrice">) {
  const errors: MaterialItemFieldErrors = {}

  if (!value.productId.trim()) {
    errors.productId = "Select a product."
  }

  if (!value.quantity.trim()) {
    errors.quantity = "Enter a quantity."
  } else if (!isEditableDecimalInput(value.quantity, 2) || !Number.isFinite(Number(value.quantity))) {
    errors.quantity = "Enter a valid quantity with up to 2 decimals."
  } else if (Number(value.quantity) <= 0) {
    errors.quantity = "Enter a quantity greater than 0."
  }

  if (value.unitPrice.trim()) {
    if (!isEditableDecimalInput(value.unitPrice, 2) || !Number.isFinite(Number(value.unitPrice))) {
      errors.unitPrice = "Enter a valid unit price with up to 2 decimals."
    } else if (Number(value.unitPrice) < 0) {
      errors.unitPrice = "Enter a unit price that is 0 or greater."
    }
  }

  return errors
}
