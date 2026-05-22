"use client"

import {
  HubSidePanelScopedList,
  HubSidePanelScopedRow,
} from "@/components/hub-side-panel"
import { formatCutLogTimestamp } from "@/modules/cut-logs"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

const EMPTY_CELL = "—"

function formatCutWithUnit(cut: string, unit: string): string {
  const trimmed = cut.trim()
  if (trimmed.length === 0) return EMPTY_CELL
  const unitTrim = unit.trim()
  return unitTrim.length > 0 ? `${trimmed} ${unitTrim}` : trimmed
}

/**
 * Paginated cut-logs list inside the inventory hub. Mirrors the property
 * hub's properties-list section: each row is clickable; click transitions
 * the panel into `section-edit-cut-log` mode for that row.
 *
 * Reuses the same query key the inline `InventoryCutLogsSection` does,
 * so mutations refresh both surfaces with one cache invalidation.
 */
export function InventoryHubCutLogsListSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { cutLogs, inventory, enterCutLogEditFromContext } = controller
  const stockUnit = inventory?.stockUnitAbbrev ?? ""

  return (
    <HubSidePanelScopedList
      title="Cut Logs"
      total={cutLogs.total}
      hasData={cutLogs.hasData}
      isError={cutLogs.isError}
      errorMessage="Could not load cut logs."
      loadingMessage="Loading cut logs…"
      emptyMessage="No cut logs on this inventory."
    >
      {cutLogs.rows.map((row) => {
        const primary = row.cutLogNumber
        const cut = formatCutWithUnit(row.cut, stockUnit)
        const status = (row.status ?? "").toString()
        const secondary = [cut, status].filter((part) => part.length > 0).join(" · ")
        const meta = formatCutLogTimestamp(row.updatedAt)
        return (
          <HubSidePanelScopedRow
            key={row.id}
            primary={primary}
            secondary={secondary.length > 0 ? secondary : null}
            meta={meta}
            onClick={() => enterCutLogEditFromContext(row)}
            ariaLabel={`Edit cut log ${row.cutLogNumber}`}
          />
        )
      })}
    </HubSidePanelScopedList>
  )
}
