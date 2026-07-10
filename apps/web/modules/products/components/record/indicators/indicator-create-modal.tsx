"use client"

import { useCallback, useMemo, useState } from "react"
import {
  CellAt,
  FieldSection,
  FormField,
  NumberCell,
  QuickCreateModal,
  TextareaCell,
  ToggleCell,
} from "@/engines/record-view"
import { WarehousePicker } from "@/modules/warehouse/components/picker/warehouse-picker"
import { UnitOfMeasurePicker } from "@/modules/unit-of-measures/components/picker/unit-of-measure-picker"
import {
  describeIndicatorFormIssues,
  EMPTY_INDICATOR_CREATE_FORM,
  INVENTORY_INDICATOR_INTERNAL_NOTES_MAX,
  validateIndicatorCreateForm,
  type InventoryIndicatorCreateForm,
} from "@builders/domain"
import { getClientErrorMessage } from "@/transport/client-errors"
import { createIndicatorRequest } from "@/modules/products/data/product-indicators-request"

/**
 * The indicator create surface — a product-locked modal (the product is fixed by
 * the record view; the operator picks the warehouse + unit + threshold). Mounted
 * conditionally by the host so each open gets fresh state. Mirrors
 * `InventoryAdjustmentCreateModal`.
 */
export function IndicatorCreateModal({
  productId,
  productName,
  onClose,
  onCreated,
}: {
  productId: string
  productName: string
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState<InventoryIndicatorCreateForm>(EMPTY_INDICATOR_CREATE_FORM)
  const [warehouseLabel, setWarehouseLabel] = useState<string | null>(null)
  const [unitLabel, setUnitLabel] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setField = useCallback(
    <K extends keyof InventoryIndicatorCreateForm>(
      field: K,
      value: InventoryIndicatorCreateForm[K],
    ) => {
      setForm((previous) => ({ ...previous, [field]: value }))
    },
    [],
  )

  const canCreate = useMemo(() => validateIndicatorCreateForm(form).length === 0, [form])

  const handleCreate = useCallback(() => {
    const issues = validateIndicatorCreateForm(form)
    if (issues.length > 0) {
      setError(describeIndicatorFormIssues(issues))
      return
    }
    setIsSaving(true)
    setError(null)
    createIndicatorRequest(productId, {
      warehouseId: form.warehouseId,
      unitId: form.unitId,
      lowStockThreshold: form.lowStockThreshold,
      internalNotes: form.internalNotes,
      isActive: form.isActive,
    })
      .then(() => onCreated())
      .catch((e) => setError(getClientErrorMessage(e, "Failed to create indicator")))
      .finally(() => setIsSaving(false))
  }, [form, productId, onCreated])

  return (
    <QuickCreateModal
      open
      title={`Add indicator — ${productName}`}
      widthClassName="max-w-3xl"
      onClose={onClose}
      onCreate={handleCreate}
      canCreate={canCreate}
      isSaving={isSaving}
      error={error}
    >
      <FieldSection>
        <CellAt col={1} colSpan={4}>
          <FormField label="Warehouse" required>
            <WarehousePicker
              value={form.warehouseId || null}
              onChange={(id) => setField("warehouseId", id ?? "")}
              onOptionSelected={(opt) => setWarehouseLabel(opt?.name ?? null)}
              selectedLabel={form.warehouseId ? warehouseLabel : null}
              placeholder="Select a warehouse"
              ariaLabel="Warehouse"
              disabled={isSaving}
            />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Unit" required>
            <UnitOfMeasurePicker
              value={form.unitId || null}
              onChange={(id) => setField("unitId", id ?? "")}
              onOptionSelected={(opt) => setUnitLabel(opt?.name ?? null)}
              selectedLabel={form.unitId ? unitLabel : null}
              placeholder="Select a unit"
              ariaLabel="Unit"
              disabled={isSaving}
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={4}>
          <FormField label="Low Threshold">
            <NumberCell
              editable={!isSaving}
              value={form.lowStockThreshold}
              onChange={(value) => setField("lowStockThreshold", value)}
              ariaLabel="Low stock threshold"
            />
          </FormField>
        </CellAt>
        <CellAt col={5} colSpan={4}>
          <FormField label="Active">
            <ToggleCell
              editable={!isSaving}
              value={form.isActive}
              onChange={(value) => setField("isActive", value)}
              ariaLabel="Indicator active"
            />
          </FormField>
        </CellAt>
        <CellAt col={1} colSpan={8}>
          <FormField
            label="Notes"
            currentLength={form.internalNotes.length}
            maxLength={INVENTORY_INDICATOR_INTERNAL_NOTES_MAX}
          >
            <TextareaCell
              editable={!isSaving}
              value={form.internalNotes}
              onChange={(value) => setField("internalNotes", value)}
              maxLength={INVENTORY_INDICATOR_INTERNAL_NOTES_MAX}
            />
          </FormField>
        </CellAt>
      </FieldSection>
    </QuickCreateModal>
  )
}
