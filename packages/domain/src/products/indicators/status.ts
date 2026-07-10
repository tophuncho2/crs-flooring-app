// Derived low-stock status for an inventory indicator. PURE — computed on read
// from the live stock for the (product, warehouse, unit) triple vs the indicator's
// single `lowStockThreshold`; NEVER stored (a stock-relative status is not
// immutable and would be stale on the next adjustment). The future notification
// worker calls this same helper to decide whether to alert.
//
// This is a SEMANTIC status enum, not a color. `BadgeTone` lives in apps/web
// (engines/common) and the domain package may not import it — the apps-side
// row-cell maps `IndicatorStockStatus` → BadgeTone (low → warning/amber,
// ok → success/green, none → neutral).

export type IndicatorStockStatus = "ok" | "low" | "none"

/**
 * `none` when no threshold is set (nothing to compare against). Otherwise `low`
 * when live stock is at or below the threshold, else `ok`.
 */
export function computeIndicatorStatus(
  currentStock: number,
  lowStockThreshold: number | null,
): IndicatorStockStatus {
  if (lowStockThreshold === null) {
    return "none"
  }
  return currentStock <= lowStockThreshold ? "low" : "ok"
}

export function describeIndicatorStatus(status: IndicatorStockStatus): string {
  switch (status) {
    case "ok":
      return "OK"
    case "low":
      return "Low"
    case "none":
      return "—"
  }
}
