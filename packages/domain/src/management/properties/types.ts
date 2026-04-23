export type PropertyManagementCompany = {
  id: string
  name: string
}

export type PropertyTemplateRow = {
  id: string
  unitType: string
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

export type PropertyListRow = {
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
  templateCount: number
  templatePreviewTags: string[]
}

export type PropertyOption = {
  id: string
  name: string
  address: string
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
  unitType: string
  warehouseId: string
}
