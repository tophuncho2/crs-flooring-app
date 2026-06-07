"use client"

import type { PropertyDetailRecord } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const PROPERTY_DETAIL_QUERY_KEY = ["properties", "detail"] as const

export async function getPropertyDetailRequest(id: string): Promise<PropertyDetailRecord> {
  const response = await requestJson<{ property: PropertyDetailRecord }>(
    `/api/properties/${id}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  )
  return response.property
}
