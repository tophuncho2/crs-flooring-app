"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { TemplateListRow } from "@builders/domain"
import { buildTemplateHubHref, useRecordEntryNavigation } from "@/hooks/navigation"
import { syncTemplateToWorkOrderRequest } from "@/modules/templates/data/mutations"

export function useTemplatesListController() {
  const router = useRouter()
  const templateNavigation = useRecordEntryNavigation("/dashboard/templates")
  const [message, setMessage] = useState("")
  const [pageError, setPageError] = useState("")
  const [syncingId, setSyncingId] = useState<string | null>(null)

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

  // List-row "Sync to Work Order": spin a work order straight off the row, then
  // navigate to it (mirrors the record-view action). The id-at-call-time sibling
  // of `useTemplateSyncToWorkOrder`; failures surface in the list's pageError
  // banner. No reset on success — the push unmounts the list.
  const syncTemplate = useCallback(
    async (templateId: string) => {
      if (syncingId) return
      setSyncingId(templateId)
      setPageError("")
      try {
        const result = await syncTemplateToWorkOrderRequest(templateId)
        router.push(`/dashboard/work-orders/${result.workOrder.id}`)
      } catch (error) {
        setPageError(error instanceof Error ? error.message : "Sync failed. Try again.")
        setSyncingId(null)
      }
    },
    [router, syncingId],
  )

  return {
    message,
    setMessage,
    pageError,
    setPageError,
    openCreate: templateNavigation.openCreate,
    openTemplate,
    syncTemplate,
    syncingId,
  }
}
