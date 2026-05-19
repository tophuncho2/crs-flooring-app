"use client"

import type { ReactNode } from "react"
import type { CutLogRow, FlooringCutLogStatus } from "@builders/domain"
import { CutLogStatusBadge } from "@/components/badges/cut-log-status-badge"
import { CheckboxCell } from "@/components/cells/checkbox-cell"
import { TextCell } from "@/components/cells/text-cell"
import { UnitCell } from "@/components/cells/unit-cell"
import type { GridControlColumn } from "@/components/grid/contracts/grid-control-column"
import { formatCutLogTimestamp } from "./format-cut-log-timestamp"

/**
 * Slim column descriptor accepted by the renderer. The renderer only
 * inspects `column.key`, so consumers can pass any column shape — typically
 * a `GridColumn<TRow>` from their grid layout — without forcing a type
 * dependency between the grid row shape and `CutLogRow`.
 */
type CutLogColumnLike = { key: string }

export type CutLogReadOnlyRenderOptions = {
  /**
   * Fallback unit label for the `cut` / `before` / `after` columns when the
   * row's snapshot fields are null (pre-snapshot rows). Post-snapshot rows
   * always use their own `stockUnitAbbrev`.
   */
  stockUnitFallback?: string
  /**
   * Fallback unit label for the `coverageCut` column. Post-snapshot rows
   * always use their own `itemCoverageUnitAbbrev`.
   */
  coverageUnitFallback?: string
  /**
   * Fallback label for the `warehouse` column when the row shape doesn't
   * carry a joined `warehouseName` (i.e. plain `CutLogRow` on the WO side).
   * Consumers on the inv side pass `InventoryCutLogRow` which already
   * carries `warehouseName`; the WO side passes the parent WO's warehouse
   * name here so every row in that grid renders the same warehouse.
   */
  warehouseFallback?: string
}

function pickStockUnit(row: CutLogRow, options: CutLogReadOnlyRenderOptions): string {
  return row.stockUnitAbbrev ?? options.stockUnitFallback ?? ""
}

function pickCoverageUnit(row: CutLogRow, options: CutLogReadOnlyRenderOptions): string {
  return row.itemCoverageUnitAbbrev ?? options.coverageUnitFallback ?? ""
}

function pickWarehouseName(
  row: CutLogRow & { warehouseName?: string | null },
  options: CutLogReadOnlyRenderOptions,
): string {
  return row.warehouseName ?? options.warehouseFallback ?? ""
}

/**
 * Read-only cell renderer for cut-log grids. Single source of truth for the
 * cell-rendering logic that was duplicated across the inventory cut-log
 * section and the inventory historical section, and (going forward) the
 * work-order cut-log section's non-editable rows.
 *
 * Consumers pass this directly to `<Grid renderCell={renderCutLogReadOnlyCell(options)}>`.
 * For editable contexts (work-order edit mode), consumers wrap this with
 * their own per-column branches and delegate to this renderer for any cell
 * that isn't currently being edited.
 *
 * The renderer prefers the row's own unit-snapshot fields
 * (`stockUnitAbbrev`, `itemCoverageUnitAbbrev`) for unit display, falling
 * back to the consumer-provided defaults. This keeps historical rows that
 * were created before the snapshot migration rendering correctly while
 * ensuring post-snapshot rows display their frozen-at-create-time unit
 * labels even if the parent inventory's UoM was later edited.
 */
export function renderCutLogReadOnlyCell(
  options: CutLogReadOnlyRenderOptions = {},
): (column: CutLogColumnLike, row: CutLogRow) => ReactNode {
  return (column, row) => {
    switch (column.key) {
      case "status":
        return <CutLogStatusBadge status={row.status as FlooringCutLogStatus} />
      case "inventoryItem":
        return (
          <TextCell
            editable={false}
            value={row.inventoryItem || "—"}
            ariaLabel={`${row.cutLogNumber} inventory item`}
          />
        )
      case "location":
        return (
          <TextCell
            editable={false}
            value={row.location || "—"}
            ariaLabel={`${row.cutLogNumber} location`}
          />
        )
      case "cutLogNumber":
        return (
          <TextCell
            editable={false}
            value={row.cutLogNumber ?? "—"}
            ariaLabel={`${row.cutLogNumber} number`}
          />
        )
      case "warehouse": {
        const warehouseName = pickWarehouseName(row, options)
        return (
          <TextCell
            editable={false}
            value={warehouseName || "—"}
            ariaLabel={`${row.cutLogNumber} warehouse`}
          />
        )
      }
      case "cut":
        return (
          <UnitCell
            editable={false}
            value={row.cut}
            unit={pickStockUnit(row, options)}
            ariaLabel={`${row.cutLogNumber} cut`}
          />
        )
      case "coverageCut":
        return (
          <UnitCell
            editable={false}
            value={row.coverageCut ?? ""}
            unit={pickCoverageUnit(row, options)}
            ariaLabel={`${row.cutLogNumber} coverage cut`}
          />
        )
      case "isWaste":
        return (
          <CheckboxCell
            editable={false}
            value={row.isWaste}
            ariaLabel={`${row.cutLogNumber} waste`}
          />
        )
      case "before":
        return (
          <TextCell
            editable={false}
            value={row.before ?? "—"}
            ariaLabel={`${row.cutLogNumber} before`}
          />
        )
      case "after":
        return (
          <TextCell
            editable={false}
            value={row.after ?? "—"}
            ariaLabel={`${row.cutLogNumber} after`}
          />
        )
      case "finalSeq":
        return (
          <TextCell
            editable={false}
            value={row.finalCutSequence != null ? String(row.finalCutSequence) : "—"}
            ariaLabel={`${row.cutLogNumber} final sequence`}
          />
        )
      case "workOrder":
        return (
          <TextCell
            editable={false}
            value={row.workOrderId ?? "—"}
            ariaLabel={`${row.cutLogNumber} work order`}
          />
        )
      case "workOrderItem":
        return (
          <TextCell
            editable={false}
            value={row.workOrderItemId ?? "—"}
            ariaLabel={`${row.cutLogNumber} material item`}
          />
        )
      case "createdAt":
        return (
          <TextCell
            editable={false}
            value={formatCutLogTimestamp(row.createdAt)}
            ariaLabel={`${row.cutLogNumber} created at`}
          />
        )
      case "updatedAt":
        return (
          <TextCell
            editable={false}
            value={formatCutLogTimestamp(row.updatedAt)}
            ariaLabel={`${row.cutLogNumber} updated at`}
          />
        )
      case "notes":
        return (
          <TextCell
            editable={false}
            value={row.notes || "—"}
            ariaLabel={`${row.cutLogNumber} notes`}
          />
        )
      default:
        return null
    }
  }
}

/**
 * Renderer for the canonical status-indicator trailing control. Inventory
 * sections (active + historical) and the WO section all share this — the
 * tone+label mapping previously lived inline as `statusTone()` /
 * `rowStatusTone()` / `rowStatusLabel()` in three places.
 */
export function renderCutLogStatusControl(
  control: GridControlColumn,
  row: CutLogRow,
): ReactNode {
  if (control.kind !== "status-indicator") return null
  return <CutLogStatusBadge status={row.status as FlooringCutLogStatus} />
}
