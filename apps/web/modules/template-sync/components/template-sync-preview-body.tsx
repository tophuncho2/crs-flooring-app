"use client"

import { TemplateSyncHeaderSection } from "@/modules/template-sync/components/header/template-sync-header-section"
import { TemplateSyncItemsSection } from "@/modules/template-sync/components/items/template-sync-items-section"
import type { TemplateSyncItemsController } from "@/modules/template-sync/controllers/use-template-sync-items"

type Props = {
  templateId: string
  itemsController: TemplateSyncItemsController
}

/**
 * Composition shell for the template-sync side-panel preview body. The header
 * section owns its own query (stable per-template snapshot); the items section
 * is now a pure presentation layer driven by the items controller hoisted into
 * the side-panel button shell.
 */
export function TemplateSyncPreviewBody({ templateId, itemsController }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <TemplateSyncHeaderSection templateId={templateId} />
      <TemplateSyncItemsSection controller={itemsController} />
    </div>
  )
}
