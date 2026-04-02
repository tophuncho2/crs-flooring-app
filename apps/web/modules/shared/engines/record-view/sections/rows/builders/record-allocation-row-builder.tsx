"use client"

import type { ReactNode } from "react"
import { CurrencyCell } from "../../cells/currency-cell"
import { QuantityCell } from "../../cells/quantity-cell"
import { RecordGridCellInput } from "../../cells/record-grid-cell-input"
import { RecordGridCellSelect } from "../../cells/record-grid-cell-select"
import { TextCell } from "../../cells/text-cell"
import { RecordItemCell } from "../../cells/record-item-cell"
import {
  RecordItemSectionControls,
  type RecordItemSectionControlsProps,
} from "../../panels/record-item-section-controls"
import { type RecordRowBuilderOption, FieldStack, buildGridCellProps } from "./record-row-builder-shared"

export function RecordAllocationRowBuilder({
  inventoryValue,
  inventoryOptions,
  quantityValue,
  unitLabel,
  unitCostValue,
  totalValue,
  notesValue,
  inventoryError,
  quantityError,
  inventoryPlaceholderLabel = "Select inventory",
  onInventoryChange,
  onQuantityChange,
  onNotesChange,
  controls,
  showCellLabels = true,
}: {
  inventoryValue: string
  inventoryOptions: RecordRowBuilderOption[]
  quantityValue: string
  unitLabel: ReactNode
  unitCostValue: ReactNode
  totalValue: ReactNode
  notesValue: string
  inventoryError?: string
  quantityError?: string
  inventoryPlaceholderLabel?: string
  onInventoryChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onNotesChange: (value: string) => void
  controls?: Omit<RecordItemSectionControlsProps, "cellChrome" | "showCellLabels">
  showCellLabels?: boolean
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("product", showCellLabels)}>
        <FieldStack error={inventoryError}>
          <RecordGridCellSelect
            value={inventoryValue}
            onChange={(event) => onInventoryChange(event.target.value)}
            invalid={Boolean(inventoryError)}
          >
            <option value="">{inventoryPlaceholderLabel}</option>
            {inventoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </RecordGridCellSelect>
        </FieldStack>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("quantity", showCellLabels)}>
        <FieldStack error={quantityError}>
          <QuantityCell
            input={(
              <RecordGridCellInput
                value={quantityValue}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onQuantityChange(event.target.value)}
                invalid={Boolean(quantityError)}
                align="center"
                controlSize="compact"
              />
            )}
          />
        </FieldStack>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("unit", showCellLabels)}>
        <TextCell align="center">{unitLabel}</TextCell>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("unitPrice", showCellLabels)}>
        <CurrencyCell value={unitCostValue} className="w-full" />
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("total", showCellLabels)}>
        <CurrencyCell value={totalValue} className="w-full" />
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("notes", showCellLabels)}>
        <RecordGridCellInput
          value={notesValue}
          placeholder="Notes"
          onChange={(event) => onNotesChange(event.target.value)}
        />
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
