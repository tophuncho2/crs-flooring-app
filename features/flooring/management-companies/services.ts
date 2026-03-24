function normalizeAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

export function normalizeManagementCompany(company: {
  id: string
  updatedAt: Date | string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  properties: Array<{
    id: string
    name: string
    streetAddress: string | null
    city: string | null
    state: string | null
    postalCode: string | null
  }>
}) {
  return {
    id: company.id,
    updatedAt: company.updatedAt instanceof Date ? company.updatedAt.toISOString() : company.updatedAt,
    name: company.name,
    streetAddress: company.streetAddress ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip: company.postalCode ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    fullAddress: normalizeAddress(company),
    properties: company.properties.map((property) => ({
      id: property.id,
      name: property.name,
      fullAddress: normalizeAddress(property),
    })),
  }
}

export function normalizeManagementCompanyListRow(company: {
  id: string
  updatedAt: Date | string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  properties: Array<{
    id: string
    name: string
  }>
  _count: { properties: number }
}) {
  return {
    id: company.id,
    updatedAt: company.updatedAt instanceof Date ? company.updatedAt.toISOString() : company.updatedAt,
    name: company.name,
    streetAddress: company.streetAddress ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip: company.postalCode ?? "",
    phone: company.phone ?? "",
    email: company.email ?? "",
    fullAddress: normalizeAddress(company),
    propertyCount: company._count.properties,
    propertyPreviewNames: company.properties.map((property) => property.name),
  }
}

export function normalizeManagementCompanyOption(company: { id: string; name: string }) {
  return { id: company.id, name: company.name }
}
