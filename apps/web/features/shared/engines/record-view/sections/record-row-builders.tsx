"use client"

import type { ReactNode } from "react"
import { RecordFieldErrorText } from "../feedback"
import { CurrencyCell } from "../ui/cells/currency-cell"
import { QuantityCell } from "../ui/cells/quantity-cell"
import { RecordGridCellInput } from "../ui/cells/record-grid-cell-input"
import { RecordGridCellSelect } from "../ui/cells/record-grid-cell-select"
import { TextCell } from "../ui/cells/text-cell"
import { RecordItemCell } from "./record-item-cell"
import {
  RecordItemSectionControls,
  type RecordItemSectionControlsProps,
} from "./record-item-section-controls"

export type RecordRowBuilderOption = {
  value: string
  label: string
}

function FieldStack({
  children,
  error,
}: {
  children: ReactNode
  error?: string
}) {
  return (
    <div className="space-y-1">
      {children}
      {error ? <RecordFieldErrorText>{error}</RecordFieldErrorText> : null}
    </div>
  )
}

function buildGridCellProps(columnKey: string) {
  return {
    columnKey,
    chrome: "grid" as const,
    showLabel: true,
  }
}

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
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("product")}>
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
      <RecordItemCell {...buildGridCellProps("quantity")}>
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
      <RecordItemCell {...buildGridCellProps("unit")}>
        <TextCell align="center">{unitLabel}</TextCell>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("unitPrice")}>
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
      <RecordItemCell {...buildGridCellProps("total")}>
        <CurrencyCell value={totalValue} className="w-full" />
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("notes")}>
        <RecordGridCellInput
          value={notesValue}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </RecordItemCell>
      {controls ? (
        <RecordItemSectionControls
          {...controls}
          cellChrome="grid"
          showCellLabels
        />
      ) : null}
    </>
  )
}

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
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("service")}>
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
      <RecordItemCell {...buildGridCellProps("name")}>
        <FieldStack error={nameError}>
          <RecordGridCellInput
            value={nameValue}
            onChange={(event) => onNameChange(event.target.value)}
            invalid={Boolean(nameError)}
          />
        </FieldStack>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("quantity")}>
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
      <RecordItemCell {...buildGridCellProps("unit")}>
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
      <RecordItemCell {...buildGridCellProps("unitPrice")}>
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
      <RecordItemCell {...buildGridCellProps("total")}>
        <CurrencyCell value={totalValue} className="w-full" />
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("notes")}>
        <RecordGridCellInput
          value={notesValue}
          onChange={(event) => onNotesChange(event.target.value)}
        />
      </RecordItemCell>
      {controls ? (
        <RecordItemSectionControls
          {...controls}
          cellChrome="grid"
          showCellLabels
        />
      ) : null}
    </>
  )
}

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
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("salesRep")}>
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
      <RecordItemCell {...buildGridCellProps("percent")}>
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
      <RecordItemCell {...buildGridCellProps("total")}>
        <CurrencyCell value={totalValue} className="w-full" />
      </RecordItemCell>
      {controls ? (
        <RecordItemSectionControls
          {...controls}
          cellChrome="grid"
          showCellLabels
        />
      ) : null}
    </>
  )
}

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
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("product")}>
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
      <RecordItemCell {...buildGridCellProps("quantity")}>
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
      <RecordItemCell {...buildGridCellProps("unit")}>
        <TextCell align="center">{unitLabel}</TextCell>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("unitPrice")}>
        <CurrencyCell value={unitCostValue} className="w-full" />
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("total")}>
        <CurrencyCell value={totalValue} className="w-full" />
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("notes")}>
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
          showCellLabels
        />
      ) : null}
    </>
  )
}

export function RecordCalculationRowBuilder({
  label,
  value,
}: {
  label: ReactNode
  value: ReactNode
}) {
  return (
    <>
      <RecordItemCell {...buildGridCellProps("calculation")}>
        <TextCell>{label}</TextCell>
      </RecordItemCell>
      <RecordItemCell {...buildGridCellProps("value")}>
        <TextCell align="right" className="font-medium">
          {value}
        </TextCell>
      </RecordItemCell>
    </>
  )
}
