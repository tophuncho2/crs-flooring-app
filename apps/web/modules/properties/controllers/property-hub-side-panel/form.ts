import {
  EMPTY_PROPERTY_HUB_PROPERTY_FIELDS,
  type CreatePropertyHubForm,
  type ManagementCompanyForm,
  type PropertyHubMcSelection,
  type PropertyHubPropertyFields,
  type PropertyHubPropertySelection,
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

export function buildFormPayload(args: {
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
