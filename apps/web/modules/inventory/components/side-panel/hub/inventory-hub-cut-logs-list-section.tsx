"use client"

import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import {
  HubSidePanelScopedRow,
  HubSidePanelScrollList,
} from "@/components/hub-side-panel"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"

const EMPTY_CELL = "—"

function formatCutWithUnit(cut: string, unit: string): string {
  const trimmed = cut.trim()
  if (trimmed.length === 0) return EMPTY_CELL
  const unitTrim = unit.trim()
  return unitTrim.length > 0 ? `${trimmed} ${unitTrim}` : trimmed
}

/**
 * Infinite-scroll cut-logs list inside the inventory hub. Mirrors the property
 * hub's properties-list section: each row is clickable; click transitions the
 * panel into `section-edit-cut-log` mode for that row. The status renders as a
 * trailing column (the created-at timestamp was dropped per the hub redesign).
 *
 * Reuses the same query key the inline `InventoryCutLogsSection` does, so
 * mutations refresh both surfaces with one cache invalidation.
 */
export function InventoryHubCutLogsListSection({
  controller,
}: {
  controller: InventoryHubSidePanelController
}) {
  const { cutLogs, inventory, enterCutLogEditFromContext } = controller
  const stockUnit = inventory?.stockUnitAbbrev ?? ""
  const { rows, hasData, isEmpty, isError, hasMore, isFetchingMore, loadMore } = cutLogs

  return (
    <HubSidePanelScrollList
      title="Cut Logs"
      hasData={hasData}
      isEmpty={isEmpty}
      isError={isError}
      errorMessage="Could not load cut logs."
      loadingMessage="Loading cut logs…"
      emptyMessage="No cut logs on this inventory."
      hasMore={hasMore}
      isFetchingMore={isFetchingMore}
      onLoadMore={loadMore}
    >
      {rows.map((row) => {
        const cut = formatCutWithUnit(row.cut, stockUnit)
        return (
          <HubSidePanelScopedRow
            key={row.id}
            primary={row.cutLogNumber}
            secondary={cut !== EMPTY_CELL ? cut : null}
            meta={<CutLogStatusBadge status={row.status} />}
            onClick={() => enterCutLogEditFromContext(row)}
            ariaLabel={`Edit cut log ${row.cutLogNumber}`}
          />
        )
      })}
    </HubSidePanelScrollList>
  )
}
