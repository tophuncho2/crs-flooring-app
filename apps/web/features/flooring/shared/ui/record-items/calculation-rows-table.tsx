"use client"

import { formatCurrencyValue } from "@/features/flooring/shared/domain/line-totals"
import { CollapsibleTableSection } from "@/features/flooring/shared/ui/table/collapsible-table-section"
import { ModalTableHead, ModalTableShell, TableHeaderCell } from "@/features/flooring/shared/ui/table/table-shell"
import { SALES_REP_ITEMS_TABLE_MIN_WIDTH_CLASS } from "@/features/flooring/shared/ui/table/table-size-classes"

export type DisplayCalculationRow = {
  key: string
  label: string
  value: number
  format: "currency" | "percentage"
}

function formatCalculationValue(row: DisplayCalculationRow) {
  if (row.format === "percentage") {
    return `${(row.value * 100).toFixed(2)}%`
  }

  return formatCurrencyValue(row.value)
}

export function CalculationRowsTable({
  title,
  items,
  loading,
}: {
  title: string
  items: DisplayCalculationRow[]
  loading: boolean
}) {
  return (
    <CollapsibleTableSection title={title}>
      <ModalTableShell minWidthClass={SALES_REP_ITEMS_TABLE_MIN_WIDTH_CLASS}>
        <ModalTableHead>
          <tr>
            <TableHeaderCell>Calculation</TableHeaderCell>
            <TableHeaderCell>Value</TableHeaderCell>
          </tr>
        </ModalTableHead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={2} className="px-3 py-8 text-center text-[var(--foreground)]/70">Loading calculations...</td>
            </tr>
          ) : items.length === 0 ? (
            <tr>
              <td colSpan={2} className="px-3 py-8 text-center text-[var(--foreground)]/70">No calculations available.</td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.key} className="border-t border-[var(--panel-border)]">
                <td className="px-3 py-2">{item.label}</td>
                <td className="px-3 py-2 font-medium">{formatCalculationValue(item)}</td>
              </tr>
            ))
          )}
        </tbody>
      </ModalTableShell>
    </CollapsibleTableSection>
  )
}
