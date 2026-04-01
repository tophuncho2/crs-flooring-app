"use client"

import { useState } from "react"
import { useRecordNotices } from "@/features/shared/engines/record-view"
import type { TemplateRow } from "../types"

export function useTemplatesClientController(initialTemplates: TemplateRow[]) {
  const [rows] = useState<TemplateRow[]>(initialTemplates)
  const notices = useRecordNotices()

  return {
    rows,
    notices,
  }
}
