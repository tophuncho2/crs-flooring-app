export type EntityDetail = {
  id: string
  createdAt: string
  updatedAt: string
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  propertyCount: number
}

export type EntityListRow = {
  id: string
  createdAt: string
  updatedAt: string
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  propertyCount: number
}

export type EntityOption = {
  id: string
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
}

export type EntityForm = {
  entity: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

export const EMPTY_ENTITY_FORM: EntityForm = {
  entity: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}
