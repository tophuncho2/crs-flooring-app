"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  ManagementCompanyDetail,
  PropertyDetailRecord,
  PropertyHubMcSelection,
  PropertyHubPropertySelection,
  PropertyPrimaryForm,
} from "@builders/domain"

export async function createPropertyRequest(input: PropertyPrimaryForm) {
  return requestJson<{ property: PropertyDetailRecord }>("/api/properties", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}

export async function updatePropertyRequest(
  id: string,
  input: PropertyPrimaryForm,
  revisionKey: string,
) {
  return requestJson<{ property: PropertyDetailRecord }>(
    `/api/properties/${id}/primary/section`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(withMutationMeta(input, revisionKey)),
    },
  )
}

export async function deletePropertyRequest(id: string, updatedAt: string) {
  return requestJson<{ ok: true }>(`/api/properties/${id}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta({}, updatedAt)),
  })
}

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
