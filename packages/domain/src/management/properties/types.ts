export type PropertyManagementCompany = {
  id: string
  name: string
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
  instructions: string
  fullAddress: string
  managementCompany: PropertyManagementCompany | null
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
}

export type PropertyOption = {
  id: string
  name: string
  address: string
  streetAddress: string
  city: string
  state: string
  postalCode: string
  instructions: string
  managementCompanyId: string | null
}

export type PropertyPrimaryForm = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  instructions: string
  managementCompanyId: string
}

export type PropertyTemplateDraft = {
  id: string
  unitType: string
  warehouseId: string
}

export type PropertyStateOption = {
  value: string
}
