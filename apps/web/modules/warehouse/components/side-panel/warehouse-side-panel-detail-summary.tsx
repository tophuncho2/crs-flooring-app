"use client"

import {
  SidePanelPreviewReadonlyRow,
  SidePanelPreviewReadonlySection,
} from "@/components/side-panel-preview"
import type { WarehouseListRow } from "@builders/domain"

function formatDate(value: string) {
  if (!value) return "—"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toISOString().slice(0, 10)
}

export function WarehouseSidePanelDetailSummary({ warehouse }: { warehouse: WarehouseListRow }) {
  return (
    <SidePanelPreviewReadonlySection>
      <SidePanelPreviewReadonlyRow label="Warehouse #" value={warehouse.number} />
      <SidePanelPreviewReadonlyRow label="Work Orders" value={warehouse.workOrdersCount} />
      <SidePanelPreviewReadonlyRow label="Created" value={formatDate(warehouse.createdAt)} />
      <SidePanelPreviewReadonlyRow label="Updated" value={formatDate(warehouse.updatedAt)} />
    </SidePanelPreviewReadonlySection>
  )
}
