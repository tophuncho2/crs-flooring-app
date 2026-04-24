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
    managementCompanyId: property.managementCompany?.id ?? "",
  }
}

export function validatePropertyPrimaryForm(input: PropertyPrimaryForm) {
  if (!input.name.trim()) {
    return "Property name is required"
  }

  return ""
}

export function createPropertyTemplatesRevisionKey(property: PropertyDetailRecord) {
  return property.templates.map((template) => `${template.id}:${template.itemsCount}`).join("|")
}
