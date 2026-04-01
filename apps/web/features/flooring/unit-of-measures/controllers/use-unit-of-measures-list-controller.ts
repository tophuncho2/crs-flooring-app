"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import type { UnitOfMeasureRow } from "../domain/types"

export function useUnitOfMeasuresListController(initialRows: UnitOfMeasureRow[]) {
  const [rows, setRows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
