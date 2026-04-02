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

export function RecordMaterialRowBuilder({
  productValue,
  productOptions,
  quantityValue,
  unitLabel,
  unitPriceValue,
  totalValue,
  notesValue,
  productError,
  quantityError,
  unitPriceError,
  productPlaceholderLabel,
  unitPriceUnit,
  onProductChange,
  onQuantityChange,
  onUnitPriceChange,
  onNotesChange,
  controls,
  showCellLabels = true,
}: {
  productValue: string
  productOptions: RecordRowBuilderOption[]
  quantityValue: string
  unitLabel: ReactNode
  unitPriceValue: string
  totalValue: ReactNode
  notesValue: string
  productError?: string
  quantityError?: string
  unitPriceError?: string
  productPlaceholderLabel?: string
  unitPriceUnit?: ReactNode
  onProductChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onUnitPriceChange: (value: string) => void
  onNotesChange: (value: string) => void
  controls?: Omit<RecordItemSectionControlsProps, "cellChrome" | "showCellLabels">
  showCellLabels?: boolean
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("product", showCellLabels)}>
        <FieldStack error={productError}>
          <RecordGridCellSelect
            value={productValue}
            onChange={(event) => onProductChange(event.target.value)}
            invalid={Boolean(productError)}
          >
            {productPlaceholderLabel ? <option value="">{productPlaceholderLabel}</option> : null}
            {productOptions.map((product) => (
              <option key={product.value} value={product.value}>
                {product.label}
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
        <FieldStack error={unitPriceError}>
          <CurrencyCell
            input={(
              <RecordGridCellInput
                value={unitPriceValue}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onUnitPriceChange(event.target.value)}
                invalid={Boolean(unitPriceError)}
                align="right"
                controlSize="compact"
              />
            )}
            unit={unitPriceUnit}
          />
        </FieldStack>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("total", showCellLabels)}>
        <CurrencyCell value={totalValue} className="w-full" />
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("notes", showCellLabels)}>
        <RecordGridCellInput
          value={notesValue}
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
