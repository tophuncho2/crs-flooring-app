import type {
  ManagementCompanyForm,
  ManagementCompanyListRow,
  PropertyListRow,
  PropertyPrimaryForm,
} from "@builders/domain"

export type {
  CreatePropertyHubForm,
  ManagementCompanyForm,
  PropertyHubMcSelection,
  PropertyHubPropertyFields,
  PropertyHubPropertySelection,
} from "@builders/domain"

export type PropertyHubMcMode = "none" | "link" | "create"

export type HubActiveView = "properties" | "templates"

export type HubPickerKind = "mc-link" | "property-filter"

export type HubMode =
  | { kind: "closed" }
  | { kind: "view"; mcId: string; tab: HubActiveView }
  | { kind: "create" }
  | { kind: "section-edit-mc"; mcId: string }
  | { kind: "section-edit-property"; propertyId: string; mcId: string | null }
  | { kind: "picker-takeover"; returnTo: HubMode; pickerKind: HubPickerKind }

export type OpenForPropertyEditSpec = {
  row: PropertyListRow
}

export type OpenForMcEditSpec = {
  row: ManagementCompanyListRow
}

export type McEditState = {
  form: ManagementCompanyForm
  baseline: ManagementCompanyForm
  updatedAt: string | null
}

export type PropertyEditState = {
  form: PropertyPrimaryForm
  baseline: PropertyPrimaryForm
  managementCompanyLabel: string | null
  updatedAt: string | null
}
