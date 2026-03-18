"use client"

import { formatCurrencyValue, sumLineTotals, type LineTotalInput } from "./line-totals"

export function RecordLineSummary({
  materialItems,
  serviceItems,
}: {
  materialItems: LineTotalInput[]
  serviceItems: LineTotalInput[]
}) {
  const materialCount = materialItems.length
  const serviceCount = serviceItems.length
  const grandTotal = sumLineTotals([...materialItems, ...serviceItems])

  return (
    <div className="grid gap-3 rounded-xl border border-[var(--panel-border)] bg-[var(--subpanel-background)] p-4 md:grid-cols-3">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Total</p>
        <p className="mt-1 text-lg font-semibold">{formatCurrencyValue(grandTotal)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Material Rows</p>
        <p className="mt-1 text-lg font-semibold">{materialCount}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Service Rows</p>
        <p className="mt-1 text-lg font-semibold">{serviceCount}</p>
      </div>
    </div>
  )
}
