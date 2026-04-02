"use client"

import type { ReactNode } from "react"
import { CurrencyCell } from "../../cells/currency-cell"
import { QuantityCell } from "../../cells/quantity-cell"
import { RecordGridCellInput } from "../../cells/record-grid-cell-input"
import { RecordGridCellSelect } from "../../cells/record-grid-cell-select"
import { RecordItemCell } from "../../cells/record-item-cell"
import {
  RecordItemSectionControls,
  type RecordItemSectionControlsProps,
} from "../../panels/record-item-section-controls"
import { type RecordRowBuilderOption, FieldStack, buildGridCellProps } from "./record-row-builder-shared"

export function RecordServiceRowBuilder({
  serviceValue,
  serviceOptions,
  nameValue,
  quantityValue,
  unitValue,
  unitOptions,
  unitPriceValue,
  totalValue,
  notesValue,
  nameError,
  quantityError,
  unitError,
  unitPriceError,
  servicePlaceholderLabel = "Custom service",
  unitPlaceholderLabel = "Unit",
  unitPriceUnit,
  onServiceChange,
  onNameChange,
  onQuantityChange,
  onUnitChange,
  onUnitPriceChange,
  onNotesChange,
  controls,
  showCellLabels = true,
}: {
  serviceValue: string
  serviceOptions: RecordRowBuilderOption[]
  nameValue: string
  quantityValue: string
  unitValue: string
  unitOptions: RecordRowBuilderOption[]
  unitPriceValue: string
  totalValue: ReactNode
  notesValue: string
  nameError?: string
  quantityError?: string
  unitError?: string
  unitPriceError?: string
  servicePlaceholderLabel?: string
  unitPlaceholderLabel?: string
  unitPriceUnit?: ReactNode
  onServiceChange: (value: string) => void
  onNameChange: (value: string) => void
  onQuantityChange: (value: string) => void
  onUnitChange: (value: string) => void
  onUnitPriceChange: (value: string) => void
  onNotesChange: (value: string) => void
  controls?: Omit<RecordItemSectionControlsProps, "cellChrome" | "showCellLabels">
  showCellLabels?: boolean
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("service", showCellLabels)}>
        <RecordGridCellSelect
          value={serviceValue}
          onChange={(event) => onServiceChange(event.target.value)}
        >
          <option value="">{servicePlaceholderLabel}</option>
          {serviceOptions.map((service) => (
            <option key={service.value} value={service.value}>
              {service.label}
            </option>
          ))}
        </RecordGridCellSelect>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("name", showCellLabels)}>
        <FieldStack error={nameError}>
          <RecordGridCellInput
            value={nameValue}
            onChange={(event) => onNameChange(event.target.value)}
            invalid={Boolean(nameError)}
          />
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
        <FieldStack error={unitError}>
          <RecordGridCellSelect
            value={unitValue}
            onChange={(event) => onUnitChange(event.target.value)}
            invalid={Boolean(unitError)}
            controlSize="compact"
          >
            <option value="">{unitPlaceholderLabel}</option>
            {unitOptions.map((unit) => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </RecordGridCellSelect>
        </FieldStack>
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
