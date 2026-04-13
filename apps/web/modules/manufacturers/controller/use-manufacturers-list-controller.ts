"use client"

import { useState } from "react"
import { useRecordNotices } from "@/modules/shared/engines/record-view/client/hooks/use-record-notices"
import type { ManufacturerRow } from "@builders/domain"

export function useManufacturersListController(initialRows: ManufacturerRow[]) {
  const [rows, setRows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
