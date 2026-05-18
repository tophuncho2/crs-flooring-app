"use client"

import type { TemplateMaterialItemRow } from "@builders/domain"
import {
  SidePanelPreviewRow,
  SidePanelPreviewSection,
} from "@/components/side-panel-preview"
import type { TemplateSyncItemsController } from "@/modules/template-sync/controllers/use-template-sync-items"

const EMPTY_CELL = "—"

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
    <SidePanelPreviewSection title="Material items" titleAside={`(${total})`}>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--foreground)]/55">{EMPTY_CELL}</p>
      ) : (
        <ul className="flex flex-col">
          {rows.map((item) => (
            <li key={item.id}>
              <SidePanelPreviewRow
                primary={item.productName}
                secondary={item.notes.trim().length > 0 ? item.notes : undefined}
                meta={formatQuantity(item)}
              />
            </li>
          ))}
        </ul>
      )}
    </SidePanelPreviewSection>
  )
}
