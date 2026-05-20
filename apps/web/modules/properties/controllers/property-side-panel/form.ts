import type { PropertyListRow, PropertyPrimaryForm } from "@builders/domain"

export const EMPTY_FORM: PropertyPrimaryForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  instructions: "",
  managementCompanyId: "",
}

export function buildFormFromRow(row: PropertyListRow): PropertyPrimaryForm {
  return {
    name: row.name,
    streetAddress: row.streetAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    email: row.email,
    instructions: "",
    managementCompanyId: row.managementCompany?.id ?? "",
  }
}

export function formIsDirty(form: PropertyPrimaryForm, baseline: PropertyPrimaryForm): boolean {
  return (
    form.name !== baseline.name ||
    form.streetAddress !== baseline.streetAddress ||
    form.city !== baseline.city ||
    form.state !== baseline.state ||
    form.zip !== baseline.zip ||
    form.phone !== baseline.phone ||
    form.email !== baseline.email ||
    form.instructions !== baseline.instructions ||
    form.managementCompanyId !== baseline.managementCompanyId
  )
}
