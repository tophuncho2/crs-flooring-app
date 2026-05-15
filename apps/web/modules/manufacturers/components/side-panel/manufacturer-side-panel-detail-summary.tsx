"use client"

import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
} from "@/components/side-panel-preview"
import type { ManufacturerRow } from "@builders/domain"

function formatDate(value: string) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

export function ManufacturerSidePanelDetailSummary({
  manufacturer,
}: {
  manufacturer: ManufacturerRow
}) {
  return (
    <SidePanelPreviewReadonlySection>
      <SidePanelPreviewReadonlyRow label="Products" value={manufacturer.productsCount} />
      <SidePanelPreviewReadonlyRow label="Created" value={formatDate(manufacturer.createdAt)} />
      <SidePanelPreviewReadonlyRow label="Updated" value={formatDate(manufacturer.updatedAt)} />
    </SidePanelPreviewReadonlySection>
  )
}
