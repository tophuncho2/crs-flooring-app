"use client"

import { formatCurrencyValue, sumLineTotals, type LineTotalInput } from "@/modules/shared/domain/line-totals"

export function RecordLineSummary({
  materialItems,
  serviceItems,
  variant = "panel",
}: {
  materialItems: LineTotalInput[]
  serviceItems: LineTotalInput[]
  variant?: "panel" | "header"
}) {
  const materialCount = materialItems.length
  const serviceCount = serviceItems.length
  const grandTotal = sumLineTotals([...materialItems, ...serviceItems])

  const isHeader = variant === "header"

  return (
    <div className={isHeader ? "grid gap-3 sm:grid-cols-3" : "grid gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] p-4 md:grid-cols-3"}>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Total</p>
        <p className={`mt-1 font-semibold ${isHeader ? "text-base" : "text-lg"}`}>{formatCurrencyValue(grandTotal)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Material Rows</p>
        <p className={`mt-1 font-semibold ${isHeader ? "text-base" : "text-lg"}`}>{materialCount}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Service Rows</p>
        <p className={`mt-1 font-semibold ${isHeader ? "text-base" : "text-lg"}`}>{serviceCount}</p>
      </div>
    </div>
  )
}
