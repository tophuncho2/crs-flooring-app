import { isEditableDecimalInput } from "./child-item-validation"
import type { FieldErrorMap } from "../feedback/record-field-errors"

export type ServiceOption = {
  id: string
  name: string
  baseCost: string
  unitId: string
  unitName: string
}

export type UnitOption = {
  id: string
  name: string
}

export type EditableServiceItem = {
  id: string
  serviceId: string
  name: string
  unitId: string
  unitName: string
  quantity: string
  unitPrice: string
  notes: string
  updatedAt: string
}

export type ServiceItemDraft = {
  serviceId: string
  name: string
  unitId: string
  quantity: string
  unitPrice: string
  notes: string
}

export type ServiceItemField = "name" | "unitId" | "quantity" | "unitPrice"
export type ServiceItemFieldErrors = FieldErrorMap<ServiceItemField>

export function validateServiceItemFields(value: Pick<ServiceItemDraft, "serviceId" | "name" | "unitId" | "quantity" | "unitPrice">) {
  const errors: ServiceItemFieldErrors = {}

  if (!value.serviceId.trim() && !value.name.trim()) {
    errors.name = "Enter a service name or select a service."
  }

  if (!value.unitId.trim()) {
    errors.unitId = "Select a unit."
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
