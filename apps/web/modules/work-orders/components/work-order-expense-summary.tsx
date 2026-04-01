"use client"

import { formatCurrencyValue } from "@builders/domain"
import type { WorkOrderExpenseSummary } from "../types"

const EMPTY_EXPENSE_SUMMARY: WorkOrderExpenseSummary = {
  customerCost: 0,
  materialExpense: 0,
  serviceExpense: 0,
  salesRepExpense: 0,
  companyExpenses: 0,
  profit: 0,
  profitMargin: 0,
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
        <p className="mt-1 text-base font-semibold">{formatCurrencyValue(safeSummary.companyExpenses)}</p>
      </div>
    </div>
  )
}
