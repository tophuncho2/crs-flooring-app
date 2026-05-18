"use client"

import type { TemplateSyncItemsController } from "@/modules/template-sync/controllers/use-template-sync-items"
import { TemplateSyncNextButton } from "@/modules/template-sync/components/toolbar-controls/sub-controls/template-sync-next-button"
import { TemplateSyncPageIndicator } from "@/modules/template-sync/components/toolbar-controls/sub-controls/template-sync-page-indicator"
import { TemplateSyncPrevButton } from "@/modules/template-sync/components/toolbar-controls/sub-controls/template-sync-prev-button"
import { TemplateSyncSectionToggleButton } from "@/modules/template-sync/components/toolbar-controls/sub-controls/template-sync-section-toggle-button"

type Props = {
  controller: TemplateSyncItemsController
  headerCollapsed: boolean
  onToggleHeader: () => void
}

/**
 * Items-pagination sub-header rendered inside the side panel's sticky header,
 * below the picker dropdowns. Divider above separates it from the pickers
 * block. Left: section-collapse toggle for the body's Property+Template
 * metadata. Right: page indicator + prev + next.
 */
export function TemplateSyncItemsSubHeader({
  controller,
  headerCollapsed,
  onToggleHeader,
}: Props) {
  const { page, totalPages, canPrev, canNext, goPrev, goNext } = controller

  return (
    <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--panel-border)] pt-3">
      <TemplateSyncSectionToggleButton
        collapsed={headerCollapsed}
        onToggle={onToggleHeader}
      />
      <div className="flex items-center gap-2">
        <TemplateSyncPageIndicator page={page} totalPages={totalPages} />
        <TemplateSyncPrevButton disabled={!canPrev} onClick={goPrev} />
        <TemplateSyncNextButton disabled={!canNext} onClick={goNext} />
      </div>
    </div>
  )
}
