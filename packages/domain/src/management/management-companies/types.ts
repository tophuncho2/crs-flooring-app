export type ManagementCompanyDetail = {
  id: string
  createdAt: string
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
}

export type ManagementCompanyListRow = {
  id: string
  createdAt: string
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
}

export type ManagementCompanyOption = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
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

export const EMPTY_MANAGEMENT_COMPANY_FORM: ManagementCompanyForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}
