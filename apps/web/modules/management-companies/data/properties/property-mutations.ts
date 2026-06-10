"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  ManagementCompanyDetail,
  PropertyDetailRecord,
  PropertyHubMcSelection,
  PropertyHubPropertySelection,
} from "@builders/domain"

export type CreatePropertyHubRequestInput = {
  managementCompany: PropertyHubMcSelection
  property: PropertyHubPropertySelection
}

export async function createPropertyHubRequest(input: CreatePropertyHubRequestInput) {
  return requestJson<{
    property: PropertyDetailRecord | null
    managementCompany: ManagementCompanyDetail | null
  }>("/api/properties/hub", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}
