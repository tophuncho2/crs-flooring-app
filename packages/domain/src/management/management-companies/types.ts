export type ManagementCompanyTemplateRow = {
  id: string
  unitType: string
  warehouseName: string
  itemsCount: number
}

export type ManagementCompanyPropertyRow = {
  id: string
  name: string
  fullAddress: string
  templates: ManagementCompanyTemplateRow[]
  templateCount: number
}

export type ManagementCompanyDetail = {
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
  properties: ManagementCompanyPropertyRow[]
}

export type ManagementCompanyListRow = {
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
  propertyCount: number
  propertyPreviewNames: string[]
}

export type ManagementCompanyOption = {
  id: string
  name: string
}

export type ManagementCompanyForm = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}
