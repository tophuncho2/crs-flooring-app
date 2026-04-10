"use client"

import { useState } from "react"
import { useRecordNotices } from "@/modules/shared/engines/record-view/client/hooks/use-record-notices"
import type { UnitOfMeasureRow } from "../types"

export function useUnitOfMeasuresListController(initialRows: UnitOfMeasureRow[]) {
  const [rows, setRows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
