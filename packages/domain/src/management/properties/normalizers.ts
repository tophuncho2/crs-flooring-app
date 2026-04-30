import { buildAddressLine } from "../../shared/address/index.js"
import type { PropertyDetailRecord, PropertyListRow, PropertyOption } from "./types.js"

type PropertyDetailInput = {
  id: string
  updatedAt: Date | string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  instructions: string | null
  managementCompany: { id: string; name: string } | null
  templates: Array<{
    id: string
    unitType: string
    warehouse: { name: string } | null
    _count: { items: number }
  }>
}

type PropertyListRowInput = {
  id: string
  updatedAt: Date | string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  managementCompany: { id: string; name: string } | null
  templates: Array<{
    id: string
    unitType: string
  }>
  _count: { templates: number }
}

type PropertyOptionInput = {
  id: string
  name: string
  updatedAt?: Date | string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  instructions: string | null
}

export function normalizeProperty(property: PropertyDetailInput): PropertyDetailRecord {
  return {
    id: property.id,
    updatedAt: property.updatedAt instanceof Date ? property.updatedAt.toISOString() : property.updatedAt,
    name: property.name,
    streetAddress: property.streetAddress ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    zip: property.postalCode ?? "",
    phone: property.phone ?? "",
    email: property.email ?? "",
    instructions: property.instructions ?? "",
    fullAddress: buildAddressLine(property),
    managementCompany: property.managementCompany,
    templates: property.templates.map((template) => ({
      id: template.id,
      unitType: template.unitType,
      warehouseName: template.warehouse?.name ?? "",
      itemsCount: template._count.items,
    })),
  }
}

export function normalizePropertyListRow(property: PropertyListRowInput): PropertyListRow {
  return {
    id: property.id,
    updatedAt: property.updatedAt instanceof Date ? property.updatedAt.toISOString() : property.updatedAt,
    name: property.name,
    streetAddress: property.streetAddress ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    zip: property.postalCode ?? "",
    phone: property.phone ?? "",
    email: property.email ?? "",
    fullAddress: buildAddressLine(property),
    managementCompany: property.managementCompany,
    templateCount: property._count.templates,
    templatePreviewTags: property.templates.map((template) => template.unitType),
  }
}

export function normalizePropertyOption(property: PropertyOptionInput): PropertyOption {
  return {
    id: property.id,
    name: property.name,
    address: buildAddressLine(property),
    streetAddress: property.streetAddress ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    postalCode: property.postalCode ?? "",
    instructions: property.instructions ?? "",
  }
}
