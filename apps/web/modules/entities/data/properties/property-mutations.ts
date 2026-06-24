"use client"

import { requestJson } from "@/transport/http"
import { withMutationMeta } from "@/transport/mutation"
import type {
  EntityDetail,
  PropertyDetailRecord,
  PropertyHubEntitySelection,
  PropertyHubPropertySelection,
} from "@builders/domain"

export type CreatePropertyHubRequestInput = {
  entity: PropertyHubEntitySelection
  property: PropertyHubPropertySelection
}

export async function createPropertyHubRequest(input: CreatePropertyHubRequestInput) {
  return requestJson<{
    property: PropertyDetailRecord | null
    entity: EntityDetail | null
  }>("/api/properties/hub", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(withMutationMeta(input)),
  })
}
