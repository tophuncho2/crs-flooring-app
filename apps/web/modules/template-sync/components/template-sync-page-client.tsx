"use client"

import { useRouter } from "next/navigation"
import { RecordDetailClientScaffold, RecordMultiSectionPanel } from "@/engines/record-view"
import { TemplateSyncBody } from "@/modules/template-sync/components/template-sync-body"
import { TemplateSyncTopToolbar } from "@/modules/template-sync/components/template-sync-top-toolbar"
import {
  useTemplateSyncController,
  type TemplateSyncInitialSelections,
} from "@/modules/template-sync/controllers/use-template-sync-controller"

/**
 * Standalone template-sync page, built on the record-view engine (same chrome
 * as work-orders / templates). The cascade pickers, sync / clear / +template
 * actions, and the selected-template preview are unchanged from the retired
 * side panel — they're reused verbatim, hosted in a single record-view
 * section. The MC / property picker arrows open the MC / property record views;
 * the template arrow opens the template detail page (handled in the controller).
 */
export function TemplateSyncPageClient({
  backHref,
  initialSelections,
}: {
  backHref: string
  initialSelections?: TemplateSyncInitialSelections
}) {
  const router = useRouter()
  const controller = useTemplateSyncController({ initialSelections })

  return (
    <RecordDetailClientScaffold title="Template sync" backHref={backHref} dirtyMessage="">
      {(page) => (
        <RecordMultiSectionPanel
          page={page}
          sections={[
            {
              key: "cascade",
              type: "field",
              order: 0,
              render: () => (
                <div className="flex flex-col gap-4">
                  <TemplateSyncTopToolbar
                    controller={controller}
                    onOpenManagementCompany={(id) =>
                      router.push(`/dashboard/management-companies/${id}`)
                    }
                    onOpenProperty={(id) => router.push(`/dashboard/properties/${id}`)}
                  />
                  <TemplateSyncBody controller={controller} />
                </div>
              ),
            },
          ]}
          footer={{ onClose: page.closePage }}
        />
      )}
    </RecordDetailClientScaffold>
  )
}
