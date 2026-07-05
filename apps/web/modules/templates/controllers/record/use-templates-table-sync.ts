"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { buildWorkOrderRecordHref } from "@/hooks/navigation"
import { syncTemplateToWorkOrderRequest } from "@/modules/templates/data/mutations"

/**
 * Row-keyed "Sync to Work Order" for any templates `DataTable` — the list page and
 * the property/entity record-view templates sections all spin a work order off a
 * row, then navigate into it. `syncingId` tracks the in-flight row so every row's
 * item disables while one is syncing. Failures surface via `errorMessage`.
 *
 * `returnTo` is the origin page the WO record's Back button should return to
 * (the caller's current URL). It rides into the WO href so Back lands back where
 * the sync launched from instead of the work-orders list.
 *
 * The id-at-call-time sibling of `useTemplateSyncToWorkOrder` (the hub's single-
 * template Sync button). No reset on success — the push unmounts the table.
 */
export function useTemplatesTableSync(returnTo?: string | null) {
  const router = useRouter()
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState("")

  const syncTemplate = useCallback(
    async (templateId: string) => {
      if (syncingId) return
      setSyncingId(templateId)
      setErrorMessage("")
      try {
        const result = await syncTemplateToWorkOrderRequest(templateId)
        // Open straight into the Requested Material view — the materials this sync
        // just created — instead of the default Adjustments view.
        router.push(
          buildWorkOrderRecordHref(result.workOrder.id, { view: "requested", returnTo }),
        )
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Sync failed. Try again.")
        setSyncingId(null)
      }
    },
    [router, returnTo, syncingId],
  )

  return { syncingId, syncTemplate, errorMessage }
}
