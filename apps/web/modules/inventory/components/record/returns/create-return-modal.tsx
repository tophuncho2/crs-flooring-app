"use client"

import { useState } from "react"
import type { ProductOption, UnitOfMeasureOption, WarehouseOption } from "@builders/domain"
import { QuickCreateModal } from "@/engines/record-view"
import { getClientErrorMessage } from "@/transport"
import {
  useReturnCreateForm,
  type ReturnCreateForm,
  type ReturnCreateResponse,
} from "@/modules/inventory/controllers/record/returns/use-return-create-form"
import { ReturnCreateFields } from "./return-create-fields"

/**
 * Seed for the Create Return modal — the draft field values plus the display-only
 * picker labels so seeded product/warehouse/unit/conversion triggers render
 * before the user touches the pickers. Mirrors `InventoryCreateSeed`.
 */
export type ReturnCreateModalSeed = {
  form: Partial<ReturnCreateForm>
  productLabel: string | null
  warehouseLabel: string | null
  unitLabel: string | null
  coverageUnitLabel?: string | null
  conversionFormulaLabel?: string | null
}

/**
 * The Create Return surface — a NEW sibling of the two SACRED adjustment create
 * modals (never edit those). Built on `QuickCreateModal`; composes the return
 * controller + the composite field body. On success the host reconciles off the
 * mutation response via `onCreated`.
 */
export function CreateReturnModal({
  open,
  seed,
  onClose,
  onCreated,
}: {
  open: boolean
  seed?: ReturnCreateModalSeed
  onClose: () => void
  onCreated: (result: ReturnCreateResponse) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const { form, setField, canSubmit, isPending, commitCreate } = useReturnCreateForm({
    clearError: () => setError(null),
    initialSeed: seed?.form,
  })

  // Display-only snapshots for the picker triggers — seeded so the triggers read
  // correctly before the user touches the pickers.
  const [productLabel, setProductLabel] = useState<string | null>(seed?.productLabel ?? null)
  const [warehouseLabel, setWarehouseLabel] = useState<string | null>(seed?.warehouseLabel ?? null)
  const [unitLabel, setUnitLabel] = useState<string | null>(seed?.unitLabel ?? null)
  const [coverageUnitLabel, setCoverageUnitLabel] = useState<string | null>(
    seed?.coverageUnitLabel ?? null,
  )
  const [conversionFormulaLabel, setConversionFormulaLabel] = useState<string | null>(
    seed?.conversionFormulaLabel ?? null,
  )

  const handleProductSelected = (option: ProductOption | null) => {
    setProductLabel(option?.name ?? null)
    // Seed the unit + conversion trio from the picked product (all overridable).
    setField("unitId", option?.unitId ?? "")
    setUnitLabel(option?.unitName || null)
    setField("coverageUnitId", option?.coverageUnitId ?? "")
    setCoverageUnitLabel(option?.coverageUnitName || null)
    setField("coveragePerUnit", option?.coveragePerUnit ?? "")
    setField("conversionFormulaId", option?.conversionFormulaId ?? "")
    setConversionFormulaLabel(option?.conversionFormulaName || null)
  }

  const handleUnitSelected = (option: UnitOfMeasureOption | null) => {
    setField("unitId", option?.id ?? "")
    setUnitLabel(option?.name ?? null)
  }

  const handleCoverageUnitSelected = (option: UnitOfMeasureOption | null) => {
    setField("coverageUnitId", option?.id ?? "")
    setCoverageUnitLabel(option?.name ?? null)
  }

  const handleFormulaSelected = (option: { id: string; name: string } | null) => {
    setField("conversionFormulaId", option?.id ?? "")
    setConversionFormulaLabel(option?.name ?? null)
  }

  const handleWarehouseSelected = (option: WarehouseOption | null) => {
    setWarehouseLabel(option?.name ?? null)
  }

  const handleCreate = () => {
    commitCreate({
      onSuccess: (result) => onCreated(result),
      onError: (err) => setError(getClientErrorMessage(err, "Failed to create return")),
    })
  }

  return (
    <QuickCreateModal
      open={open}
      title="Create return"
      widthClassName="max-w-5xl"
      onClose={onClose}
      onCreate={handleCreate}
      canCreate={canSubmit}
      isSaving={isPending}
      error={error}
    >
      <ReturnCreateFields
        form={form}
        setField={setField}
        editable={!isPending}
        productLabel={productLabel}
        warehouseLabel={warehouseLabel}
        unitLabel={unitLabel}
        coverageUnitLabel={coverageUnitLabel}
        conversionFormulaLabel={conversionFormulaLabel}
        onProductSelected={handleProductSelected}
        onUnitSelected={handleUnitSelected}
        onWarehouseSelected={handleWarehouseSelected}
        onCoverageUnitSelected={handleCoverageUnitSelected}
        onFormulaSelected={handleFormulaSelected}
      />
    </QuickCreateModal>
  )
}
