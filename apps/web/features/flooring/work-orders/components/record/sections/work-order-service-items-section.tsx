"use client"

import { DeleteRowButton, SaveRowButton } from "@/features/dashboard/shared/table/row-action-buttons"
import { RecordInlineActionsCell } from "@/features/dashboard/shared/record-view/sections/record-inline-actions-cell"
import { RecordItemCell } from "@/features/dashboard/shared/record-view/sections/record-item-cell"
import { RecordSectionMetric } from "@/features/dashboard/shared/record-view/sections/record-section-metric"
import { RecordSectionShell } from "@/features/dashboard/shared/record-view/sections/record-section-shell"
import { RECORD_SECTION_BORDER_CLASS_NAME } from "@/features/dashboard/shared/record-view/sections/record-section-tokens"
import {
  InlineAddRowButton,
  useInlineCreateRow,
} from "@/features/dashboard/shared/record-view/child-tables/collapsible-table-section"
import { formatLineTotal } from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import { LineItemPriceField, LineItemQuantityField, LineItemTotalField } from "@/features/flooring/shared/ui/record-items/line-item-table-cells"
import {
  FieldErrorText,
  getFieldControlClassName,
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import type {
  EditableServiceItem,
  ServiceItemDraft,
  ServiceItemField,
  ServiceItemFieldErrors,
  ServiceOption,
  UnitOption,
} from "@/features/flooring/shared/line-items/service-items-editor"
import {
  WORK_ORDER_SERVICE_GRID_CLASS_NAME,
} from "@/features/flooring/work-orders/components/record/sections/work-order-line-item-grid"
import { buildServiceSectionMetrics } from "@/features/flooring/work-orders/components/record/sections/work-order-section-metrics"

function ServiceItemRow({
  item,
  serviceOptions,
  unitOptions,
  savingItemId,
  deletingItemId,
  itemErrors = {},
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  item: EditableServiceItem
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  savingItemId: string | null
  deletingItemId: string | null
  itemErrors?: RowFieldErrors<ServiceItemField>
  onItemFieldChange: (itemId: string, field: keyof EditableServiceItem, value: string) => void
  onSaveItem: (item: EditableServiceItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const rowErrors = itemErrors[item.id]

  return (
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
          <LineItemQuantityField
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.quantity || rowErrors?.unitId))}
            input={
              <input
                value={item.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent outline-none"
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
          <LineItemPriceField
            className={getFieldControlClassName("w-full", Boolean(rowErrors?.unitPrice))}
            input={
              <input
                value={item.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent outline-none"
              />
            }
            unit={item.unitName || "unit"}
          />
          {rowErrors?.unitPrice ? <FieldErrorText>{rowErrors.unitPrice}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Total">
        <LineItemTotalField value={formatLineTotal(item)} className="w-full justify-end" />
      </RecordItemCell>
      <RecordItemCell label="Notes">
        <input
          value={item.notes}
          onChange={(event) => onItemFieldChange(item.id, "notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </RecordItemCell>
      <RecordInlineActionsCell>
        <div className="grid grid-cols-2 gap-2">
          <SaveRowButton onClick={() => onSaveItem(item)} disabled={savingItemId === item.id} className="w-full">
            {savingItemId === item.id ? "Saving..." : "Save"}
          </SaveRowButton>
          <DeleteRowButton onClick={() => onDeleteItem(item.id)} disabled={deletingItemId === item.id} className="w-full">
            {deletingItemId === item.id ? "Deleting..." : "Delete"}
          </DeleteRowButton>
        </div>
      </RecordInlineActionsCell>
    </div>
  )
}

function ServiceDraftRow({
  draft,
  serviceOptions,
  unitOptions,
  adding,
  draftErrors = {},
  onDraftChange,
  onAdd,
}: {
  draft: ServiceItemDraft
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  adding: boolean
  draftErrors?: ServiceItemFieldErrors
  onDraftChange: (field: keyof ServiceItemDraft, value: string) => void
  onAdd: () => void
}) {
  return (
    <div className={[WORK_ORDER_SERVICE_GRID_CLASS_NAME, hasFieldErrors(draftErrors) ? "bg-rose-500/[0.03]" : ""].filter(Boolean).join(" ")}>
      <RecordItemCell label="Service">
        <select
          value={draft.serviceId}
          onChange={(event) => {
            const nextServiceId = event.target.value
            const selected = serviceOptions.find((service) => service.id === nextServiceId)
            onDraftChange("serviceId", nextServiceId)
            if (selected) {
              onDraftChange("name", selected.name)
              onDraftChange("unitId", selected.unitId)
              onDraftChange("unitPrice", selected.baseCost)
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
            value={draft.name}
            onChange={(event) => onDraftChange("name", event.target.value)}
            className={getFieldControlClassName(
              "w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1",
              Boolean(draftErrors.name),
            )}
          />
          {draftErrors.name ? <FieldErrorText>{draftErrors.name}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Qty">
        <div className="space-y-1">
          <LineItemQuantityField
            className={getFieldControlClassName("w-full", Boolean(draftErrors.quantity || draftErrors.unitId))}
            input={
              <input
                value={draft.quantity}
                inputMode="decimal"
                spellCheck={false}
                placeholder="Qty"
                onChange={(event) => onDraftChange("quantity", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent outline-none"
              />
            }
            unit={
              <select
                value={draft.unitId}
                onChange={(event) => onDraftChange("unitId", event.target.value)}
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
          {draftErrors.quantity ? <FieldErrorText>{draftErrors.quantity}</FieldErrorText> : null}
          {draftErrors.unitId ? <FieldErrorText>{draftErrors.unitId}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Unit Price">
        <div className="space-y-1">
          <LineItemPriceField
            className={getFieldControlClassName("w-full", Boolean(draftErrors.unitPrice))}
            input={
              <input
                value={draft.unitPrice}
                inputMode="decimal"
                spellCheck={false}
                onChange={(event) => onDraftChange("unitPrice", normalizeEditableDecimalInput(event.target.value))}
                className="w-16 bg-transparent outline-none"
              />
            }
            unit={unitOptions.find((unit) => unit.id === draft.unitId)?.name || "unit"}
          />
          {draftErrors.unitPrice ? <FieldErrorText>{draftErrors.unitPrice}</FieldErrorText> : null}
        </div>
      </RecordItemCell>
      <RecordItemCell label="Total">
        <LineItemTotalField value={formatLineTotal(draft)} className="w-full justify-end" />
      </RecordItemCell>
      <RecordItemCell label="Notes">
        <input
          value={draft.notes}
          onChange={(event) => onDraftChange("notes", event.target.value)}
          className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
        />
      </RecordItemCell>
      <RecordInlineActionsCell>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding}
          className="rounded-md border border-blue-500/25 px-3 py-2 text-sm font-medium hover:bg-[var(--panel-hover)] disabled:opacity-60"
        >
          {adding ? "Adding..." : "Add"}
        </button>
      </RecordInlineActionsCell>
    </div>
  )
}

export function WorkOrderServiceItemsSection({
  title,
  items,
  draft,
  serviceOptions,
  unitOptions,
  loading,
  adding,
  savingItemId,
  deletingItemId,
  draftErrors = {},
  itemErrors = {},
  totalAmount,
  onDraftChange,
  onAdd,
  onItemFieldChange,
  onSaveItem,
  onDeleteItem,
}: {
  title: string
  items: EditableServiceItem[]
  draft: ServiceItemDraft
  serviceOptions: ServiceOption[]
  unitOptions: UnitOption[]
  loading: boolean
  adding: boolean
  savingItemId: string | null
  deletingItemId: string | null
  draftErrors?: ServiceItemFieldErrors
  itemErrors?: RowFieldErrors<ServiceItemField>
  totalAmount?: number
  onDraftChange: (field: keyof ServiceItemDraft, value: string) => void
  onAdd: () => Promise<boolean> | boolean
  onItemFieldChange: (itemId: string, field: keyof EditableServiceItem, value: string) => void
  onSaveItem: (item: EditableServiceItem) => void
  onDeleteItem: (itemId: string) => void
}) {
  const addRow = useInlineCreateRow(false)
  const metrics = buildServiceSectionMetrics(items, totalAmount)

  async function handleAdd() {
    const didAdd = await onAdd()
    if (didAdd !== false) {
      addRow.close()
    }
  }

  return (
    <RecordSectionShell
      title={title}
      bodyClassName="space-y-4"
      metrics={metrics.map((metric) => (
        <RecordSectionMetric key={metric.label} label={metric.label} value={metric.value} />
      ))}
    >
      {loading ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-8 text-center text-[var(--foreground)]/70`}>
          Loading services...
        </div>
      ) : null}
      {!loading
        ? items.map((item) => (
            <div key={item.id}>
              <ServiceItemRow
                item={item}
                serviceOptions={serviceOptions}
                unitOptions={unitOptions}
                savingItemId={savingItemId}
                deletingItemId={deletingItemId}
                itemErrors={itemErrors}
                onItemFieldChange={onItemFieldChange}
                onSaveItem={onSaveItem}
                onDeleteItem={onDeleteItem}
              />
            </div>
          ))
        : null}
      {!loading && !addRow.isOpen ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border border-dashed px-4 py-4`}>
          <InlineAddRowButton label={`Add ${title}`} onClick={addRow.open} className={RECORD_SECTION_BORDER_CLASS_NAME} />
        </div>
      ) : null}
      {!loading && addRow.isOpen ? (
        <div className={`${RECORD_SECTION_BORDER_CLASS_NAME} border px-4 py-4`}>
          <ServiceDraftRow
            draft={draft}
            serviceOptions={serviceOptions}
            unitOptions={unitOptions}
            adding={adding}
            draftErrors={draftErrors}
            onDraftChange={onDraftChange}
            onAdd={() => void handleAdd()}
          />
        </div>
      ) : null}
    </RecordSectionShell>
  )
}
