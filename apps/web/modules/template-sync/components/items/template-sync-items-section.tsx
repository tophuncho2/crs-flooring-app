"use client"

import type { TemplateMaterialItemRow } from "@builders/domain"
import { SidePanelPreviewSection } from "@/components/side-panel-preview"
import type { TemplateSyncItemsController } from "@/modules/template-sync/controllers/use-template-sync-items"

const EMPTY_CELL = "—"
const GRID_BORDER = "border-blue-500/40"

function formatQuantity(item: TemplateMaterialItemRow): string {
  const qty = item.quantity.trim()
  const unit = item.sendUnitAbbrev.trim()
  if (qty.length === 0) return EMPTY_CELL
  return unit.length > 0 ? `${qty} ${unit}` : qty
}

type Props = {
  controller: TemplateSyncItemsController
}

export function TemplateSyncItemsSection({ controller }: Props) {
  const { hasData, isError, total, rows } = controller

  if (!hasData) {
    return (
      <SidePanelPreviewSection title="Material items">
        <p className="text-xs text-[var(--foreground)]/55">
          {isError ? "Could not load material items." : "Loading material items…"}
        </p>
      </SidePanelPreviewSection>
    )
  }

  return (
    <div>
      <div>
        <span
          className={`inline-block rounded-t-md border border-b-0 ${GRID_BORDER} bg-blue-500/15 px-3 py-1 text-xs font-bold text-[var(--foreground)]/85`}
        >
          Material items ({total})
        </span>
      </div>
      <div className={`overflow-hidden rounded-md rounded-tl-none border ${GRID_BORDER}`}>
        {rows.length === 0 ? (
          <div className="px-3 py-2 text-xs text-[var(--foreground)]/55">{EMPTY_CELL}</div>
        ) : (
          rows.map((item) => (
            <div
              key={item.id}
              className={`grid grid-cols-[1fr_auto] items-start gap-3 border-t ${GRID_BORDER} px-3 py-2 transition first:border-t-0 hover:bg-[var(--panel-hover)]`}
            >
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm text-[var(--foreground)]/85">
                  {item.productName}
                </span>
                {item.notes.trim().length > 0 ? (
                  <span className="whitespace-pre-wrap text-xs text-[var(--foreground)]/55">
                    {item.notes}
                  </span>
                ) : null}
              </div>
              <span
                className={`shrink-0 border-l ${GRID_BORDER} pl-3 text-sm tabular-nums text-[var(--foreground)]/70`}
              >
                {formatQuantity(item)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
