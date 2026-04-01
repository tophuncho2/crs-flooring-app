"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/flooring/shared/use-record-notices"
import type { ManufacturerRow } from "../domain/types"

export function useManufacturersListController(initialRows: ManufacturerRow[]) {
  const [rows, setRows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
