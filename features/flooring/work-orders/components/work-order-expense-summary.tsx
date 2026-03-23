"use client"

import { formatCurrencyValue } from "@/features/flooring/shared/domain/line-totals"
import type { WorkOrderExpenseSummary } from "../types"

const EMPTY_EXPENSE_SUMMARY: WorkOrderExpenseSummary = {
  materialTotal: 0,
  serviceTotal: 0,
  customerCost: 0,
  salesRepExpense: 0,
  expenses: 0,
}

export function WorkOrderExpenseSummaryHeader({
  summary,
}: {
  summary?: WorkOrderExpenseSummary | null
}) {
  const safeSummary = summary ?? EMPTY_EXPENSE_SUMMARY

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Customer Cost</p>
        <p className="mt-1 text-base font-semibold">{formatCurrencyValue(safeSummary.customerCost)}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--foreground)]/60">Expenses</p>
        <p className="mt-1 text-base font-semibold">{formatCurrencyValue(safeSummary.expenses)}</p>
      </div>
    </div>
  )
}
