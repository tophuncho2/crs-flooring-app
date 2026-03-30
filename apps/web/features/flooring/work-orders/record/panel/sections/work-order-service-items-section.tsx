"use client"

import type { ReactNode } from "react"
import {
  CurrencyCell,
  QuantityCell,
  RecordGridCellInput,
  RecordGridCellSelect,
  RecordItemCell,
  RecordRowDeleteButton,
  RecordRowLayout,
  RecordSectionItem,
  RecordSectionShell,
  RecordSectionStatusBadge,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/features/shared/engines/record-view"
import { formatLineTotal } from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import { RecordFieldErrorText } from "@/features/shared/engines/record-view"
import type {
  EditableServiceItem,
  ServiceItemField,
  ServiceOption,
  UnitOption,
} from "@/features/flooring/shared/line-items/service-items-editor"
import { WORK_ORDER_SERVICE_COLUMNS } from "./work-order-line-item-grid"
import { buildServiceSectionMetrics } from "./work-order-section-metrics"

function ServiceItemRow({
  item,
  serviceOptions,
  unitOptions,
  itemErrors = {},
  onItemFieldChange,
  onDeleteItem,
}: {
  item: EditableServiceItem
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  itemErrors?: RowFieldErrors<ServiceItemField>
  onItemFieldChange: (itemId: string, field: keyof EditableServiceItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const rowErrors = itemErrors[item.id]
  const isLocalOnlyItem = item.id.startsWith("temp:")

  return (
    <RecordSectionItem
    >
      <RecordRowLayout columns={WORK_ORDER_SERVICE_COLUMNS}>
        <RecordItemCell label="Service" columnKey="service">
        <RecordGridCellSelect
          value={item.serviceId}
          onChange={(event) => {
            const nextServiceId = event.target.value
            const selected = serviceOptions.find((service) => service.id === nextServiceId)
            onItemFieldChange(item.id, "serviceId", nextServiceId)
            if (selected) {
              onItemFieldChange(item.id, "name", selected.name)
              onItemFieldChange(item.id, "unitId", selected.unitId)
              onItemFieldChange(item.id, "unitName", selected.unitName)
              onItemFieldChange(item.id, "unitPrice", selected.baseCost)
            }
          }}
        >
          <option value="">Custom service</option>
          {serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </RecordGridCellSelect>
        </RecordItemCell>
        <RecordItemCell label="Name" columnKey="name">
        <div className="space-y-1">
          <RecordGridCellInput
            value={item.name}
            onChange={(event) => onItemFieldChange(item.id, "name", event.target.value)}
            invalid={Boolean(rowErrors?.name)}
          />
          {rowErrors?.name ? <RecordFieldErrorText>{rowErrors.name}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Qty" columnKey="quantity">
        <div className="space-y-1">
          <QuantityCell
            input={
              <RecordGridCellInput
                value={item.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                invalid={Boolean(rowErrors?.quantity)}
                align="center"
                controlSize="compact"
              />
            }
            unit={
              <RecordGridCellSelect
                value={item.unitId}
                onChange={(event) => {
                  const nextUnitId = event.target.value
                  const selected = unitOptions.find((unit) => unit.id === nextUnitId)
                  onItemFieldChange(item.id, "unitId", nextUnitId)
                  onItemFieldChange(item.id, "unitName", selected?.name ?? "")
                }}
                invalid={Boolean(rowErrors?.unitId)}
                controlSize="compact"
              >
                <option value="">Unit</option>
                {unitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </RecordGridCellSelect>
            }
          />
          {rowErrors?.quantity ? <RecordFieldErrorText>{rowErrors.quantity}</RecordFieldErrorText> : null}
          {rowErrors?.unitId ? <RecordFieldErrorText>{rowErrors.unitId}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Unit Price" columnKey="unitPrice">
        <div className="space-y-1">
          <CurrencyCell
            input={
              <RecordGridCellInput
                value={item.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(event.target.value))}
                invalid={Boolean(rowErrors?.unitPrice)}
                align="right"
                controlSize="compact"
              />
            }
            unit={item.unitName || "unit"}
          />
          {rowErrors?.unitPrice ? <RecordFieldErrorText>{rowErrors.unitPrice}</RecordFieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Total" columnKey="total">
        <CurrencyCell value={formatLineTotal(item)} className="w-full" />
        </RecordItemCell>
        <RecordItemCell label="Notes" columnKey="notes">
        <RecordGridCellInput
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
        />
        </RecordItemCell>
        <RecordItemCell label="Status" columnKey="status">
        <div className="flex min-h-[2.5rem] items-center">
          <RecordSectionStatusBadge tone={isLocalOnlyItem ? "warning" : "neutral"}>
            {isLocalOnlyItem ? "Unsaved" : "Ready"}
          </RecordSectionStatusBadge>
          {hasFieldErrors(rowErrors) ? <RecordSectionStatusBadge tone="error">Needs review</RecordSectionStatusBadge> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Remove" columnKey="remove">
        <div className="flex min-h-[2.5rem] items-center justify-start xl:justify-end">
          <RecordRowDeleteButton onClick={() => onDeleteItem(item.id)}>Remove</RecordRowDeleteButton>
        </div>
        </RecordItemCell>
      </RecordRowLayout>
    </RecordSectionItem>
  )
}

export function WorkOrderServiceItemsSection({
  title,
  items,
  serviceOptions,
  unitOptions,
  loading,
  actionPanel,
  itemErrors = {},
  totalAmount,
  onItemFieldChange,
  onDeleteItem,
}: {
  title: string
  items: EditableServiceItem[]
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  loading: boolean
  actionPanel?: ReactNode
  itemErrors?: RowFieldErrors<ServiceItemField>
  totalAmount?: number
  onItemFieldChange: (itemId: string, field: keyof EditableServiceItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const metrics = buildServiceSectionMetrics(items, totalAmount)

  return (
    <RecordSectionShell
      title={title}
      bodyClassName="space-y-4"
      statusPanel={actionPanel}
      metrics={metrics}
    >
      {loading ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading services...
        </div>
      ) : null}
      {!loading && items.length === 0 ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border border-dashed px-4 py-8 text-center text-[var(--foreground)]/65`}>
          No service items yet.
        </div>
      ) : null}
      {!loading
        ? items.map((item) => (
            <ServiceItemRow
              key={item.id}
              item={item}
              serviceOptions={serviceOptions}
              unitOptions={unitOptions}
              itemErrors={itemErrors}
              onItemFieldChange={onItemFieldChange}
              onDeleteItem={onDeleteItem}
            />
          ))
        : null}
    </RecordSectionShell>
  )
}
