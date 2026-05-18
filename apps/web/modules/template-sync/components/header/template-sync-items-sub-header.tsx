"use client"

import type { TemplateSyncItemsController } from "@/modules/template-sync/controllers/use-template-sync-items"
import { TemplateSyncNextButton } from "@/modules/template-sync/components/toolbar-controls/sub-controls/template-sync-next-button"
import { TemplateSyncPageIndicator } from "@/modules/template-sync/components/toolbar-controls/sub-controls/template-sync-page-indicator"
import { TemplateSyncPrevButton } from "@/modules/template-sync/components/toolbar-controls/sub-controls/template-sync-prev-button"

type Props = {
  controller: TemplateSyncItemsController
}

/**
 * Items-pagination sub-header rendered inside the side panel's sticky header,
 * below the picker dropdowns. Right-aligned row: page indicator, prev, next.
 * Divider above separates it from the pickers block.
 */
export function TemplateSyncItemsSubHeader({ controller }: Props) {
  const { page, totalPages, canPrev, canNext, goPrev, goNext } = controller

  return (
    <div className="mt-3 flex items-center justify-end gap-2 border-t border-[var(--panel-border)] pt-3">
      <TemplateSyncPageIndicator page={page} totalPages={totalPages} />
      <TemplateSyncPrevButton disabled={!canPrev} onClick={goPrev} />
      <TemplateSyncNextButton disabled={!canNext} onClick={goNext} />
    </div>
  )
}
