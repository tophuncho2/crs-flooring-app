import { isBlankName } from "../../shared/name-rules.js"
import type { ManagementCompanyDetail, ManagementCompanyForm } from "./types.js"

export function toManagementCompanyForm(company: ManagementCompanyDetail): ManagementCompanyForm {
  return {
    name: company.name,
    streetAddress: company.streetAddress,
    city: company.city,
    state: company.state,
    zip: company.zip,
    phone: company.phone,
    email: company.email,
  }
}

export function validateManagementCompanyForm(input: ManagementCompanyForm) {
  if (isBlankName(input.name)) {
    return "Company name is required"
  }

  return ""
}
