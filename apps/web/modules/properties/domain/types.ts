export type PropertyManagementCompany = {
  id: string
  name: string
}

export type PropertyTemplateRow = {
  id: string
  templateTag: string
  warehouseName: string
  itemsCount: number
}

export type PropertyDetailRecord = {
  id: string
  updatedAt: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: PropertyManagementCompany | null
  templates: PropertyTemplateRow[]
}

export type PropertyPrimaryForm = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  managementCompanyId: string
}

export type PropertyTemplateDraft = {
  id: string
  templateTag: string
  warehouseId: string
}

export function toPropertyPrimaryForm(property: PropertyDetailRecord): PropertyPrimaryForm {
  return {
    name: property.name,
    streetAddress: property.streetAddress,
    city: property.city,
    state: property.state,
    zip: property.zip,
    phone: property.phone,
    email: property.email,
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
