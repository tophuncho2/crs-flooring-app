import { buildAddressLine } from "../../shared/address/index.js"
import { normalizePhoneNumber } from "../../shared/phone.js"
import type {
  ManagementCompanyDetail,
  ManagementCompanyListRow,
  ManagementCompanyOption,
} from "./types.js"

type ManagementCompanyDetailInput = {
  id: string
  updatedAt: Date | string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  _count: { properties: number }
}

type ManagementCompanyListRowInput = {
  id: string
  updatedAt: Date | string
  name: string
  streetAddress: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  phone: string | null
  email: string | null
  _count: { properties: number }
}

export function normalizeManagementCompany(company: ManagementCompanyDetailInput): ManagementCompanyDetail {
  return {
    id: company.id,
    updatedAt: company.updatedAt instanceof Date ? company.updatedAt.toISOString() : company.updatedAt,
    name: company.name,
    streetAddress: company.streetAddress ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip: company.postalCode ?? "",
    phone: normalizePhoneNumber(company.phone ?? ""),
    email: company.email ?? "",
    fullAddress: buildAddressLine(company),
    propertyCount: company._count.properties,
  }
}

export function normalizeManagementCompanyListRow(company: ManagementCompanyListRowInput): ManagementCompanyListRow {
  return {
    id: company.id,
    updatedAt: company.updatedAt instanceof Date ? company.updatedAt.toISOString() : company.updatedAt,
    name: company.name,
    streetAddress: company.streetAddress ?? "",
    city: company.city ?? "",
    state: company.state ?? "",
    zip: company.postalCode ?? "",
    phone: normalizePhoneNumber(company.phone ?? ""),
    email: company.email ?? "",
    fullAddress: buildAddressLine(company),
    propertyCount: company._count.properties,
  }
}

export function normalizeManagementCompanyOption(company: { id: string; name: string }): ManagementCompanyOption {
  return { id: company.id, name: company.name }
}
