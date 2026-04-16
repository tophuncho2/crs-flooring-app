"use client"

import { useState } from "react"
import { useRecordNotices } from "@/modules/shared/engines/record-view/client/hooks/use-record-notices"
import type { CategoryRow } from "../types"

export function useCategoriesListController(initialRows: CategoryRow[]) {
  const [rows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
