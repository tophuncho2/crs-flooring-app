"use client"

import type { ReactNode } from "react"
import { CurrencyCell } from "../../cells/currency-cell"
import { RecordGridCellInput } from "../../cells/record-grid-cell-input"
import { RecordGridCellSelect } from "../../cells/record-grid-cell-select"
import { RecordItemCell } from "../../cells/record-item-cell"
import {
  RecordItemSectionControls,
  type RecordItemSectionControlsProps,
} from "../../panels/record-item-section-controls"
import { type RecordRowBuilderOption, FieldStack, buildGridCellProps } from "./record-row-builder-shared"

export function RecordSalesRepRowBuilder({
  salesRepValue,
  salesRepOptions,
  percentValue,
  totalValue,
  salesRepError,
  percentError,
  salesRepPlaceholderLabel = "Select sales rep",
  onSalesRepChange,
  onPercentChange,
  controls,
  showCellLabels = true,
}: {
  salesRepValue: string
  salesRepOptions: RecordRowBuilderOption[]
  percentValue: string
  totalValue: ReactNode
  salesRepError?: string
  percentError?: string
  salesRepPlaceholderLabel?: string
  onSalesRepChange: (value: string) => void
  onPercentChange: (value: string) => void
  controls?: Omit<RecordItemSectionControlsProps, "cellChrome" | "showCellLabels">
  showCellLabels?: boolean
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("salesRep", showCellLabels)}>
        <FieldStack error={salesRepError}>
          <RecordGridCellSelect
            value={salesRepValue}
            onChange={(event) => onSalesRepChange(event.target.value)}
            invalid={Boolean(salesRepError)}
          >
            <option value="">{salesRepPlaceholderLabel}</option>
            {salesRepOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </RecordGridCellSelect>
        </FieldStack>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("percent", showCellLabels)}>
        <FieldStack error={percentError}>
          <div className="flex min-h-[2.5rem] items-center gap-2">
            <RecordGridCellInput
              value={percentValue}
              inputMode="decimal"
              spellCheck={false}
              onChange={(event) => onPercentChange(event.target.value)}
              invalid={Boolean(percentError)}
              align="right"
              controlSize="compact"
            />
            <span className="shrink-0 text-[var(--foreground)]/60">%</span>
          </div>
        </FieldStack>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("total", showCellLabels)}>
        <CurrencyCell value={totalValue} className="w-full" />
      </RecordItemCell>
      {controls ? (
        <RecordItemSectionControls
          {...controls}
          cellChrome="grid"
          showCellLabels={showCellLabels}
        />
      ) : null}
    </>
  )
}
