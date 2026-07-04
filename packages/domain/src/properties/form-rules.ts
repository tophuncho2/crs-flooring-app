import { isBlankName } from "../../shared/name-rules.js"
import type { PropertyDetailRecord, PropertyPrimaryForm } from "./types.js"

export function toPropertyPrimaryForm(property: PropertyDetailRecord): PropertyPrimaryForm {
  return {
    name: property.name,
    streetAddress: property.streetAddress,
    city: property.city,
    state: property.state,
    zip: property.zip,
    phone: property.phone,
    email: property.email,
    instructions: property.instructions,
    color: property.color,
    entityId: property.entity?.id ?? "",
  }
}

export function validatePropertyPrimaryForm(input: PropertyPrimaryForm) {
  if (isBlankName(input.name)) {
    return "Property name is required"
  }

  return ""
}
