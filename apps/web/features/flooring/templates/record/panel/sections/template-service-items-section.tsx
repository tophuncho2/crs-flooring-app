"use client"

import {
  RecordItemSection,
  RecordRowStatusBadge,
  RecordSectionGrid,
  RecordSectionGridRow,
  RecordServiceRowBuilder,
  type RecordSectionSubHeaderProps,
} from "@/features/shared/engines/record-view"
import { formatLineTotal } from "@/features/flooring/shared/line-items/line-totals"
import { normalizeEditableDecimalInput } from "@/features/flooring/shared/line-items/child-item-validation"
import {
  hasFieldErrors,
  type RowFieldErrors,
} from "@/features/flooring/shared/line-items/record-field-errors"
import type {
  EditableServiceItem,
  ServiceItemField,
  ServiceOption,
  UnitOption,
} from "@/features/flooring/shared/line-items/service-items-editor"
import { TEMPLATE_SERVICE_COLUMNS } from "./template-line-item-grid"
import { buildTemplateServiceSectionMetrics } from "./template-section-metrics"

function readStatusLabel(item: EditableServiceItem, hasErrors: boolean) {
  if (hasErrors) return "Needs Review"
  if (item.id.startsWith("temp:")) return "Unsaved"
  return "Ready"
}

function readStatusTone(item: EditableServiceItem, hasErrors: boolean) {
  if (hasErrors) return "error" as const
  if (item.id.startsWith("temp:")) return "warning" as const
  return "neutral" as const
}

export function TemplateServiceItemsSection({
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
  const metrics = buildTemplateServiceSectionMetrics(items, totalAmount)

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
        columns={TEMPLATE_SERVICE_COLUMNS}
        isEmpty={items.length === 0}
        emptyState="No service items yet."
      >
        {items.map((item, index) => {
          const rowErrors = itemErrors[item.id]
          const hasErrors = hasFieldErrors(rowErrors)

          return (
            <RecordSectionGridRow key={item.id} columns={TEMPLATE_SERVICE_COLUMNS}>
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
                      <RecordRowStatusBadge tone={readStatusTone(item, hasErrors)}>
                        {readStatusLabel(item, hasErrors)}
                      </RecordRowStatusBadge>
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
