"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { TemplateListRow } from "@builders/domain"
import { buildTemplateHubHref, useRecordEntryNavigation } from "@/hooks/navigation"

export function useTemplatesListController() {
  const router = useRouter()
  const templateNavigation = useRecordEntryNavigation("/dashboard/templates")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")

  // A template row opens the template hub with the row pre-seeded (the hub also
  // fills the pickers from the loaded record, but seeding avoids a flash).
  const openTemplate = useCallback(
    (row: TemplateListRow) => {
      router.push(
        buildTemplateHubHref({
          templateId: row.id,
          templateLabel: row.unitType,
          propertyId: row.propertyId,
          propertyLabel: row.propertyName,
          managementCompanyId: row.managementCompanyId,
          managementCompanyLabel: row.managementCompanyName,
          returnTo: templateNavigation.returnTo,
        }),
      )
    },
    [router, templateNavigation.returnTo],
  )

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: templateNavigation.openCreate,
    openTemplate,
  }
}
