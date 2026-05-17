"use client"

import type { ManagementCompanyDetail } from "@builders/domain"
import { requestJson } from "@/transport/http"

export const MANAGEMENT_COMPANY_DETAIL_QUERY_KEY = [
  "management-companies",
  "detail",
] as const

export async function getManagementCompanyDetailRequest(
  id: string,
): Promise<ManagementCompanyDetail> {
  const response = await requestJson<{ managementCompany: ManagementCompanyDetail }>(
    `/api/management-companies/${id}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
    },
  )
  return response.managementCompany
}
