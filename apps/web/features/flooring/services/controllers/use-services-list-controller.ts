"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import type { ServiceRow } from "../domain/types"

export function useServicesListController(initialRows: ServiceRow[]) {
  const [rows, setRows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
