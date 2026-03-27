import { StatusPill } from "@/features/dashboard/shared/feedback/status-pill"
import type { InventoryRow } from "@/features/flooring/inventory/domain/types"
import {
  formatImportStatus,
  formatTransportType,
  getImportStatusFieldClass,
  getTransportTypeFieldClass,
} from "@/features/flooring/imports/contracts"

export function InventoryHeaderActions({
  row,
}: {
  row: InventoryRow
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <StatusPill label={formatTransportType(row.importTransportType)} toneClassName={getTransportTypeFieldClass(row.importTransportType)} />
      <StatusPill label={formatImportStatus(row.importStatus)} toneClassName={getImportStatusFieldClass(row.importStatus)} />
    </div>
  )
}
