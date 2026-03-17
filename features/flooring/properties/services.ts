export function normalizePropertyAddress(value: {
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return [value.streetAddress, value.city, value.state, value.postalCode].filter(Boolean).join(", ")
}

export function normalizeProperty(property: {
  id: string
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
    templateTag: string
    warehouse: { name: string } | null
    _count: { items: number; serviceItems: number }
  }>
}) {
  return {
    id: property.id,
    name: property.name,
    streetAddress: property.streetAddress ?? "",
    city: property.city ?? "",
    state: property.state ?? "",
    zip: property.postalCode ?? "",
    phone: property.phone ?? "",
    email: property.email ?? "",
    fullAddress: normalizePropertyAddress(property),
    managementCompany: property.managementCompany,
    templates: property.templates.map((template) => ({
      id: template.id,
      templateTag: template.templateTag,
      warehouseName: template.warehouse?.name ?? "",
      itemsCount: template._count.items + template._count.serviceItems,
    })),
  }
}

export function normalizePropertyOption(property: {
  id: string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
}) {
  return {
    id: property.id,
    name: property.name,
    address: normalizePropertyAddress(property),
  }
}
