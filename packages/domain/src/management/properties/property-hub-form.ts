import type { ManagementCompanyForm } from "../management-companies/types.js"
import { validateManagementCompanyForm } from "../management-companies/form-rules.js"
import { isBlankName } from "../../shared/name-rules.js"
import {
  PROPERTY_HUB_NO_ACTIONS_MESSAGE,
  PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE,
  PROPERTY_NAME_REQUIRED_MESSAGE,
} from "./error-messages.js"

export type PropertyHubPropertyFields = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  instructions: string
}

export type PropertyHubMcSelection =
  | { mode: "none" }
  | { mode: "link"; id: string }
  | { mode: "create"; fields: ManagementCompanyForm }

export type PropertyHubPropertySelection =
  | { mode: "none" }
  | { mode: "create"; fields: PropertyHubPropertyFields }

export type CreatePropertyHubForm = {
  managementCompany: PropertyHubMcSelection
  property: PropertyHubPropertySelection
}

export const EMPTY_PROPERTY_HUB_PROPERTY_FIELDS: PropertyHubPropertyFields = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  instructions: "",
}

export function validateCreatePropertyHubForm(form: CreatePropertyHubForm): string {
  const hasMcCreate = form.managementCompany.mode === "create"
  const hasPropertyCreate = form.property.mode === "create"

  // Order matters: a "link" selection is not a "create", so the
  // link-requires-property case must be checked before the no-actions guard —
  // otherwise "link an MC but create no property" would fall through to the
  // generic no-actions message instead of the specific one.
  if (form.managementCompany.mode === "link" && !hasPropertyCreate) {
    return PROPERTY_HUB_LINK_REQUIRES_PROPERTY_MESSAGE
  }

  if (!hasMcCreate && !hasPropertyCreate) {
    return PROPERTY_HUB_NO_ACTIONS_MESSAGE
  }

  if (form.managementCompany.mode === "create") {
    const mcError = validateManagementCompanyForm(form.managementCompany.fields)
    if (mcError) return mcError
  }

  if (form.property.mode === "create" && isBlankName(form.property.fields.name)) {
    return PROPERTY_NAME_REQUIRED_MESSAGE
  }

  return ""
}
