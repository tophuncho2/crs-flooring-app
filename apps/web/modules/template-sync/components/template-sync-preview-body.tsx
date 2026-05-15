"use client"

import { TemplateSyncHeaderSection } from "@/modules/template-sync/components/header/template-sync-header-section"
import { TemplateSyncItemsSection } from "@/modules/template-sync/components/items/template-sync-items-section"

type Props = {
  templateId: string
}

/**
 * Composition shell for the template-sync side-panel preview body. The header
 * section owns its own query (stable per-template snapshot) and the items
 * section owns its own paginated query — paging through items does not
 * refetch the header.
 */
export function TemplateSyncPreviewBody({ templateId }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <TemplateSyncHeaderSection templateId={templateId} />
      <TemplateSyncItemsSection templateId={templateId} />
    </div>
  )
}
