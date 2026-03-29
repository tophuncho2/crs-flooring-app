"use client"

import type { ReactNode } from "react"
import { DeleteRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import {
  CurrencyCell,
  QuantityCell,
  RecordItemCell,
  RecordSectionItem,
  RecordSectionMetric,
  RecordSectionShell,
  RecordSectionStatusBadge,
  RECORD_SECTION_BORDER_CLASS_NAME,
} from "@/features/shared/engines/record-view"
import { formatLineTotal } from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  FieldErrorText,
  getFieldControlClassName,
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import type {
  EditableServiceItem,
  ServiceItemField,
  ServiceOption,
  UnitOption,
} from "@/features/flooring/shared/line-items/service-items-editor"
import { WORK_ORDER_SERVICE_GRID_CLASS_NAME } from "./work-order-line-item-grid"
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
      <div className={WORK_ORDER_SERVICE_GRID_CLASS_NAME}>
        <RecordItemCell label="Service">
        <select
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
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        >
          <option value="">Custom service</option>
          {serviceOptions.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </select>
        </RecordItemCell>
        <RecordItemCell label="Name">
        <div className="space-y-1">
          <input
            value={item.name}
            onChange={(event) => onItemFieldChange(item.id, "name", event.target.value)}
            className={getFieldControlClassName(
              "w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1",
              Boolean(rowErrors?.name),
            )}
          />
          {rowErrors?.name ? <FieldErrorText>{rowErrors.name}</FieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Qty">
        <div className="space-y-1">
          <QuantityCell
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.quantity || rowErrors?.unitId))}
            input={
              <input
                value={item.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent text-center outline-none"
              />
            }
            unit={
              <select
                value={item.unitId}
                onChange={(event) => {
                  const nextUnitId = event.target.value
                  const selected = unitOptions.find((unit) => unit.id === nextUnitId)
                  onItemFieldChange(item.id, "unitId", nextUnitId)
                  onItemFieldChange(item.id, "unitName", selected?.name ?? "")
                }}
                className="max-w-[7rem] bg-transparent text-xs outline-none"
              >
                <option value="">Unit</option>
                {unitOptions.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
            }
          />
          {rowErrors?.quantity ? <FieldErrorText>{rowErrors.quantity}</FieldErrorText> : null}
          {rowErrors?.unitId ? <FieldErrorText>{rowErrors.unitId}</FieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Unit Price">
        <div className="space-y-1">
          <CurrencyCell
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.unitPrice))}
            input={
              <input
                value={item.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent text-right outline-none"
              />
            }
            unit={item.unitName || "unit"}
          />
          {rowErrors?.unitPrice ? <FieldErrorText>{rowErrors.unitPrice}</FieldErrorText> : null}
        </div>
        </RecordItemCell>
        <RecordItemCell label="Total">
        <CurrencyCell value={formatLineTotal(item)} className="w-full" />
        </RecordItemCell>
        <RecordItemCell label="Notes">
        <input
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
        </RecordItemCell>
        <RecordItemCell label="Controls">
        <div className="flex flex-wrap items-center gap-2">
          <RecordSectionStatusBadge tone={isLocalOnlyItem ? "warning" : "neutral"}>
            {isLocalOnlyItem ? "Unsaved" : "Ready"}
          </RecordSectionStatusBadge>
          {hasFieldErrors(rowErrors) ? <RecordSectionStatusBadge tone="error">Needs review</RecordSectionStatusBadge> : null}
          <DeleteRowButton onClick={() => onDeleteItem(item.id)}>
            Remove
          </DeleteRowButton>
        </div>
        </RecordItemCell>
      </div>
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
      metrics={metrics.map((metric) => (
        <RecordSectionMetric key={metric.label} label={metric.label} value={metric.value} />
      ))}
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
