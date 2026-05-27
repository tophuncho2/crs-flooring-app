"use client"

import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
} from "@/components/side-panel-preview"
import { formatEasternDateTime, type ManufacturerRow } from "@builders/domain"

export function ManufacturerSidePanelDetailSummary({
  manufacturer,
}: {
  manufacturer: ManufacturerRow
}) {
  return (
    <SidePanelPreviewReadonlySection>
      <SidePanelPreviewReadonlyRow label="Products" value={manufacturer.productsCount} />
      <SidePanelPreviewReadonlyRow
        label="Created"
        value={formatEasternDateTime(manufacturer.createdAt) || "—"}
      />
      <SidePanelPreviewReadonlyRow
        label="Updated"
        value={formatEasternDateTime(manufacturer.updatedAt) || "—"}
      />
    </SidePanelPreviewReadonlySection>
  )
}
