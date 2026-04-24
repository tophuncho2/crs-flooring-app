"use client"

import { useState } from "react"
import { useRecordNotices } from "@/modules/shared/engines/record-view/client/hooks/use-record-notices"
import type { ManagementCompanyListRow } from "@builders/domain"

export function useManagementCompaniesListController(initialRows: ManagementCompanyListRow[]) {
  const [rows, setRows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    setRows,
    notices,
  }
}
