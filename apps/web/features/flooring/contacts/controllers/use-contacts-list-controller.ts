"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/dashboard/shared/record-view/client/use-record-notices"
import type { ContactRow } from "../domain/types"

export function useContactsListController(initialRows: ContactRow[]) {
  const [rows, setRows] = useState(initialRows)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
