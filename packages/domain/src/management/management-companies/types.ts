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
