"use client"

import type { ReactNode } from "react"
import {
  composeRollNumberDisplay,
  type InventoryAdjustmentRow,
  type FlooringInventoryAdjustmentStatus,
} from "@builders/domain"
import { AdjustmentStatusBadge } from "@/components/badges/adjustment-status-badge"
import { CheckboxCell } from "@/components/cells/checkbox-cell"
import { TextCell } from "@/components/cells/text-cell"
import { UnitCell } from "@/components/cells/unit-cell"
import type { GridControlColumn } from "@/components/grid/contracts/grid-control-column"
import { formatAdjustmentTimestamp } from "./format-adjustment-timestamp"

/**
 * Slim column descriptor accepted by the renderer. The renderer only
 * inspects `column.key`, so consumers can pass any column shape — typically
 * a `GridColumn<TRow>` from their grid layout — without forcing a type
 * dependency between the grid row shape and `InventoryAdjustmentRow`.
 */
type AdjustmentColumnLike = { key: string }

export type AdjustmentReadOnlyRenderOptions = {
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
}

function pickStockUnit(row: InventoryAdjustmentRow, options: AdjustmentReadOnlyRenderOptions): string {
  return row.stockUnitAbbrev ?? options.stockUnitFallback ?? ""
}

function pickCoverageUnit(row: InventoryAdjustmentRow, options: AdjustmentReadOnlyRenderOptions): string {
  return row.itemCoverageUnitAbbrev ?? options.coverageUnitFallback ?? ""
}

/**
 * Read-only cell renderer for adjustment grids. Single source of truth for the
 * cell-rendering logic that was duplicated across the inventory adjustment
 * section and the inventory historical section, and (going forward) the
 * work-order adjustment section's non-editable rows.
 *
 * Consumers pass this directly to `<Grid renderCell={renderAdjustmentReadOnlyCell(options)}>`.
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
export function renderAdjustmentReadOnlyCell(
  options: AdjustmentReadOnlyRenderOptions = {},
): (
  column: AdjustmentColumnLike,
  row: InventoryAdjustmentRow & { warehouseName?: string | null; workOrderNumber?: string | null },
) => ReactNode {
  function renderReadOnlyCell(
    column: AdjustmentColumnLike,
    row: InventoryAdjustmentRow & { warehouseName?: string | null; workOrderNumber?: string | null },
  ): ReactNode {
    switch (column.key) {
      case "status":
        return <AdjustmentStatusBadge status={row.status as FlooringInventoryAdjustmentStatus} />
      case "inventoryItem":
        return (
          <TextCell
            editable={false}
            value={row.inventoryItem || "—"}
            ariaLabel={`${row.adjustmentNumber} inventory item`}
          />
        )
      case "location":
        return (
          <TextCell
            editable={false}
            value={row.location || "—"}
            ariaLabel={`${row.adjustmentNumber} location`}
          />
        )
      case "adjustmentNumber":
        return (
          <TextCell
            editable={false}
            value={row.adjustmentNumber ?? "—"}
            ariaLabel={`${row.adjustmentNumber} number`}
          />
        )
      case "warehouse":
      case "warehouseName":
        return (
          <TextCell
            editable={false}
            value={row.warehouseName || "—"}
            ariaLabel={`${row.adjustmentNumber} warehouse`}
          />
        )
      case "adjustmentType":
        return (
          <TextCell
            editable={false}
            value={row.adjustmentType === "INCREASE" ? "Increase" : "Deduction"}
            ariaLabel={`${row.adjustmentNumber} type`}
          />
        )
      case "productName":
        return (
          <TextCell
            editable={false}
            value={row.productName || "—"}
            ariaLabel={`${row.adjustmentNumber} product`}
          />
        )
      case "inventoryNumber":
        return (
          <TextCell
            editable={false}
            value={row.inventoryNumber || "—"}
            ariaLabel={`${row.adjustmentNumber} inventory number`}
          />
        )
      case "rollNumber":
        return (
          <TextCell
            editable={false}
            value={composeRollNumberDisplay(row.rollPrefix ?? "", row.rollNumber ?? "") || "—"}
            ariaLabel={`${row.adjustmentNumber} roll number`}
          />
        )
      case "dyeLot":
        return (
          <TextCell
            editable={false}
            value={row.dyeLot || "—"}
            ariaLabel={`${row.adjustmentNumber} dye lot`}
          />
        )
      case "inventoryNote":
        return (
          <TextCell
            editable={false}
            value={row.inventoryNote || "—"}
            ariaLabel={`${row.adjustmentNumber} inventory note`}
          />
        )
      case "quantity":
        return (
          <UnitCell
            editable={false}
            value={row.quantity}
            unit={pickStockUnit(row, options)}
            ariaLabel={`${row.adjustmentNumber} cut`}
          />
        )
      case "coverage":
        return (
          <UnitCell
            editable={false}
            value={row.coverage ?? ""}
            unit={pickCoverageUnit(row, options)}
            ariaLabel={`${row.adjustmentNumber} coverage cut`}
          />
        )
      case "isWaste":
        return (
          <CheckboxCell
            editable={false}
            value={row.isWaste}
            ariaLabel={`${row.adjustmentNumber} waste`}
          />
        )
      case "before":
        return (
          <TextCell
            editable={false}
            value={row.before ?? "—"}
            ariaLabel={`${row.adjustmentNumber} before`}
          />
        )
      case "after":
        return (
          <TextCell
            editable={false}
            value={row.after ?? "—"}
            ariaLabel={`${row.adjustmentNumber} after`}
          />
        )
      case "finalSeq":
      case "finalSequence":
        return (
          <TextCell
            editable={false}
            value={row.finalSequence != null ? String(row.finalSequence) : "—"}
            ariaLabel={`${row.adjustmentNumber} final sequence`}
          />
        )
      case "workOrder":
        return (
          <TextCell
            editable={false}
            value={row.workOrderId ?? "—"}
            ariaLabel={`${row.adjustmentNumber} work order`}
          />
        )
      case "workOrderNumber":
        return (
          <TextCell
            editable={false}
            value={row.workOrderNumber || "—"}
            ariaLabel={`${row.adjustmentNumber} work order number`}
          />
        )
      case "workOrderItem":
        return (
          <TextCell
            editable={false}
            value={row.workOrderItemId ?? "—"}
            ariaLabel={`${row.adjustmentNumber} material item`}
          />
        )
      case "createdAt":
        return (
          <TextCell
            editable={false}
            value={formatAdjustmentTimestamp(row.createdAt)}
            ariaLabel={`${row.adjustmentNumber} created at`}
          />
        )
      case "updatedAt":
        return (
          <TextCell
            editable={false}
            value={formatAdjustmentTimestamp(row.updatedAt)}
            ariaLabel={`${row.adjustmentNumber} updated at`}
          />
        )
      case "notes":
        return (
          <TextCell
            editable={false}
            value={row.notes || "—"}
            ariaLabel={`${row.adjustmentNumber} notes`}
          />
        )
      default:
        return null
    }
  }

  return renderReadOnlyCell
}

/**
 * Renderer for the canonical status-indicator trailing control. Inventory
 * sections (active + historical) and the WO section all share this — the
 * tone+label mapping previously lived inline as `statusTone()` /
 * `rowStatusTone()` / `rowStatusLabel()` in three places.
 */
export function renderAdjustmentStatusControl(
  control: GridControlColumn,
  row: InventoryAdjustmentRow,
): ReactNode {
  if (control.kind !== "status-indicator") return null
  return <AdjustmentStatusBadge status={row.status as FlooringInventoryAdjustmentStatus} />
}
