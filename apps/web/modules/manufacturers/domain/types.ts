export type ManufacturerRow = {
  id: string
  companyName: string
  agentName: string
  website: string
  phone: string
  email: string
  productsCount: number
  createdAt: string
  updatedAt: string
}

export type ManufacturerForm = {
  companyName: string
  agentName: string
  website: string
  phone: string
  email: string
}

export const EMPTY_MANUFACTURER_FORM: ManufacturerForm = {
  companyName: "",
  agentName: "",
  website: "",
  phone: "",
  email: "",
}

export function toManufacturerForm(manufacturer: ManufacturerRow): ManufacturerForm {
  return {
    companyName: manufacturer.companyName,
    agentName: manufacturer.agentName,
    website: manufacturer.website,
    phone: manufacturer.phone,
    email: manufacturer.email,
  }
}
