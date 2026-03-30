export type ManagementCompanyTemplateRow = {
  id: string
  templateTag: string
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

export type ManagementCompanyForm = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

export function toManagementCompanyForm(company: ManagementCompanyDetail): ManagementCompanyForm {
  return {
    name: company.name,
    streetAddress: company.streetAddress,
    city: company.city,
    state: company.state,
    zip: company.zip,
    phone: company.phone,
    email: company.email,
  }
}

export function validateManagementCompanyForm(input: ManagementCompanyForm) {
  if (!input.name.trim()) {
    return "Company name is required"
  }

  return ""
}
