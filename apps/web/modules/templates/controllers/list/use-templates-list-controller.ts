"use client"

import { useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import type { TemplateListRow } from "@builders/domain"
import { buildTemplateHubHref, useRecordEntryNavigation } from "@/hooks/navigation"
import { useTemplatesTableSync } from "@/modules/templates/controllers/record/use-templates-table-sync"

export function useTemplatesListController() {
  const router = useRouter()
  const templateNavigation = useRecordEntryNavigation("/dashboard/templates")
  const [message, setMessage] = useState("")

  // List-row "Sync to Work Order": spin a work order off the row, then navigate to
  // it. Shared with the property/entity record-view templates sections via
  // `useTemplatesTableSync`; `returnTo` (the current list URL) rides into the WO
  // href so its Back button returns to this list, not the work-orders list.
  const sync = useTemplatesTableSync(templateNavigation.returnTo)

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
          entityId: row.entityId,
          entityLabel: row.entityName,
          returnTo: templateNavigation.returnTo,
        }),
      )
    },
    [router, templateNavigation.returnTo],
  )

  return {
    message,
    setMessage,
    pageError: sync.errorMessage,
    openCreate: templateNavigation.openCreate,
    openTemplate,
    syncTemplate: sync.syncTemplate,
    syncingId: sync.syncingId,
  }
}
