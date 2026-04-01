"use client"

import {
  RecordItemSection,
  RecordRowStatusBadge,
  RecordSectionGrid,
  RecordSectionGridRow,
  RecordServiceRowBuilder,
  resolveRecordRowStatus,
  type RecordSectionSubHeaderProps,
} from "@/modules/shared/engines/record-view"
import { formatLineTotal } from "@builders/domain"
import { normalizeEditableDecimalInput } from "@/modules/shared/engines/record-view/contracts/child-item-validation"
import {
  hasFieldErrors,
  type RowFieldErrors,
} from "@/modules/shared/engines/record-view/feedback/record-field-errors"
import type {
  EditableServiceItem,
  ServiceItemField,
  ServiceOption,
  UnitOption,
} from "@/modules/shared/engines/record-view/line-items/service-items-editor"
import { WORK_ORDER_SERVICE_COLUMNS } from "./work-order-line-item-grid"
import { buildServiceSectionMetrics } from "./work-order-section-metrics"

export function WorkOrderServiceItemsSection({
  title,
  items,
  serviceOptions,
  unitOptions,
  loading,
  subHeader,
  noticeMessage,
  noticeError,
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
  subHeader?: Omit<RecordSectionSubHeaderProps, "sectionType" | "capabilities">
  noticeMessage?: string
  noticeError?: string
  itemErrors?: RowFieldErrors<ServiceItemField>
  totalAmount?: number
  onItemFieldChange: (itemId: string, field: keyof EditableServiceItem, value: string) => void
  onDeleteItem: (itemId: string) => void
}) {
  const metrics = buildServiceSectionMetrics(items, totalAmount)

  return (
    <RecordItemSection
      title={title}
      bodyClassName="space-y-0"
      subHeader={subHeader}
      noticeMessage={noticeMessage}
      noticeError={noticeError}
      metrics={metrics}
      capabilities={{
        editable: true,
        supportsAddRow: true,
        supportsRemoveRow: true,
        supportsStatusColumn: true,
        supportsSaveDiscard: true,
        supportsMetrics: true,
        supportsSummary: true,
        supportsEmptyState: false,
      }}
      loading={loading}
      loadingState={<div className="border px-4 py-8 text-center text-[var(--foreground)]/70">Loading services...</div>}
      isEmpty={false}
    >
      <RecordSectionGrid
        columns={WORK_ORDER_SERVICE_COLUMNS}
        isEmpty={items.length === 0}
        emptyState="No service items yet."
      >
        {items.map((item, index) => {
          const rowErrors = itemErrors[item.id]
          const status = resolveRecordRowStatus({
            hasErrors: hasFieldErrors(rowErrors),
            isUnsaved: item.id.startsWith("temp:"),
          })

          return (
            <RecordSectionGridRow key={item.id} columns={WORK_ORDER_SERVICE_COLUMNS}>
              <RecordServiceRowBuilder
                serviceValue={item.serviceId}
                serviceOptions={serviceOptions.map((service) => ({
                  value: service.id,
                  label: service.name,
                }))}
                nameValue={item.name}
                quantityValue={item.quantity}
                unitValue={item.unitId}
                unitOptions={unitOptions.map((unit) => ({
                  value: unit.id,
                  label: unit.name,
                }))}
                unitPriceValue={item.unitPrice}
                unitPriceUnit={item.unitName || "unit"}
                totalValue={formatLineTotal(item)}
                notesValue={item.notes}
                nameError={rowErrors?.name}
                quantityError={rowErrors?.quantity}
                unitError={rowErrors?.unitId}
                unitPriceError={rowErrors?.unitPrice}
                showCellLabels={index === 0}
                onServiceChange={(value) => {
                  const selected = serviceOptions.find((service) => service.id === value)
                  onItemFieldChange(item.id, "serviceId", value)
                  if (selected) {
                    onItemFieldChange(item.id, "name", selected.name)
                    onItemFieldChange(item.id, "unitId", selected.unitId)
                    onItemFieldChange(item.id, "unitName", selected.unitName)
                    onItemFieldChange(item.id, "unitPrice", selected.baseCost)
                  }
                }}
                onNameChange={(value) => onItemFieldChange(item.id, "name", value)}
                onQuantityChange={(value) => onItemFieldChange(item.id, "quantity", normalizeEditableDecimalInput(value))}
                onUnitChange={(value) => {
                  const selected = unitOptions.find((unit) => unit.id === value)
                  onItemFieldChange(item.id, "unitId", value)
                  onItemFieldChange(item.id, "unitName", selected?.name ?? "")
                }}
                onUnitPriceChange={(value) => onItemFieldChange(item.id, "unitPrice", normalizeEditableDecimalInput(value))}
                onNotesChange={(value) => onItemFieldChange(item.id, "notes", value)}
                controls={{
                  capabilities: { supportsStatusColumn: true, supportsRemoveRow: true },
                  status: {
                    content: (
                      <RecordRowStatusBadge tone={status.tone}>{status.label}</RecordRowStatusBadge>
                    ),
                  },
                  remove: {
                    onRemove: () => onDeleteItem(item.id),
                  },
                }}
              />
            </RecordSectionGridRow>
          )
        })}
      </RecordSectionGrid>
    </RecordItemSection>
  )
}
