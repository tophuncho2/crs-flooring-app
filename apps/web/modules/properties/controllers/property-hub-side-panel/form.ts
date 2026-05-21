import {
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  type CreatePropertyHubForm,
  type ManagementCompanyForm,
  type ManagementCompanyListRow,
  type PropertyHubMcSelection,
  type PropertyHubPropertyFields,
  type PropertyHubPropertySelection,
  type PropertyListRow,
  type PropertyPrimaryForm,
} from "@builders/domain"
import type { PropertyHubMcMode } from "./types"

export const EMPTY_MC_FORM: ManagementCompanyForm = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}

export const EMPTY_PROPERTY_PRIMARY_FORM: PropertyPrimaryForm = {
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

export { EMPTY_PROPERTY_HUB_PROPERTY_FIELDS }

export function mcFieldsHaveAnyValue(form: ManagementCompanyForm): boolean {
  return Boolean(
    form.name ||
      form.streetAddress ||
      form.city ||
      form.state ||
      form.zip ||
      form.phone ||
      form.email,
  )
}

export function deriveMcMode(
  mcLinkId: string | null,
  mcForm: ManagementCompanyForm,
): PropertyHubMcMode {
  if (mcLinkId) return "link"
  if (mcFieldsHaveAnyValue(mcForm)) return "create"
  return "none"
}

export function buildCreatePayload(args: {
  mcLinkId: string | null
  mcForm: ManagementCompanyForm
  propertyTouched: boolean
  propertyForm: PropertyHubPropertyFields
}): CreatePropertyHubForm {
  let managementCompany: PropertyHubMcSelection
  if (args.mcLinkId) {
    managementCompany = { mode: "link", id: args.mcLinkId }
  } else if (mcFieldsHaveAnyValue(args.mcForm)) {
    managementCompany = { mode: "create", fields: args.mcForm }
  } else {
    managementCompany = { mode: "none" }
  }

  let property: PropertyHubPropertySelection
  if (args.propertyTouched && args.propertyForm.name.trim()) {
    property = { mode: "create", fields: args.propertyForm }
  } else {
    property = { mode: "none" }
  }

  return { managementCompany, property }
}

export function buildMcFormFromRow(row: ManagementCompanyListRow): ManagementCompanyForm {
  return {
    name: row.name,
    streetAddress: row.streetAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
    phone: row.phone,
    email: row.email,
  }
}

export function mcFormIsDirty(
  form: ManagementCompanyForm,
  baseline: ManagementCompanyForm,
): boolean {
  return (
    form.name !== baseline.name ||
    form.streetAddress !== baseline.streetAddress ||
    form.city !== baseline.city ||
    form.state !== baseline.state ||
    form.zip !== baseline.zip ||
    form.phone !== baseline.phone ||
    form.email !== baseline.email
  )
}

export function buildPropertyFormFromRow(row: PropertyListRow): PropertyPrimaryForm {
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

export function propertyFormIsDirty(
  form: PropertyPrimaryForm,
  baseline: PropertyPrimaryForm,
): boolean {
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
