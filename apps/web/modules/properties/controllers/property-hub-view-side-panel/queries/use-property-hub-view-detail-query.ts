"use client"

import { useQuery } from "@tanstack/react-query"
import type { ManagementCompanyDetail } from "@builders/domain"
import {
  MANAGEMENT_COMPANY_DETAIL_QUERY_KEY,
  getManagementCompanyDetailRequest,
} from "@/modules/management-companies/data/management-company-detail-request"

export function usePropertyHubViewDetailQuery(managementCompanyId: string | null) {
  return useQuery<ManagementCompanyDetail>({
    queryKey: [...MANAGEMENT_COMPANY_DETAIL_QUERY_KEY, managementCompanyId],
    queryFn: () => getManagementCompanyDetailRequest(managementCompanyId as string),
    enabled: managementCompanyId !== null,
    refetchOnWindowFocus: false,
  })
}
