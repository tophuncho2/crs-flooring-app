"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { ProductOption, WarehouseOption } from "@builders/domain"
import {
  RecordCreateClientScaffold,
  RecordFieldSection,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { buildInventoryRecordHref } from "@/hooks/navigation"
import { getClientErrorMessage } from "@/transport"
import {
  useInventoryCreateSection,
  type InventoryCreateForm,
} from "@/modules/inventory/controllers/record/create/use-inventory-create-section"
import { InventoryCreateFields } from "./inventory-create-fields"

/** Dirty-section label surfaced in the scaffold's leave-guard message. */
const CREATE_DIRTY_SECTION = "create"

/**
 * Seed for the create form when opened from a source row (the "duplicate" entry
 * point). Carries the draft field values plus the display-only picker labels +
 * stock-unit suffix so the seeded product/warehouse triggers render immediately.
 */
export type InventoryCreateSeed = {
  form: Partial<InventoryCreateForm>
  productLabel: string | null
  warehouseLabel: string | null
  stockUnitAbbrev: string
}

/**
 * The "create inventory row" flow as its own page (a create scaffold over a
 * single section). The user picks a product + warehouse and fills the editable
 * fields; on success a brand-new row's record page opens. When `seed` is
 * supplied (opened from a row's Duplicate action) the form opens pre-filled from
 * that row.
 */
function InventoryCreatePanel({
  page,
  seed,
}: {
  page: RecordDetailClientScaffoldContext
  seed?: InventoryCreateSeed
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const create = useInventoryCreateSection({
    clearError: () => setError(null),
    initialSeed: seed?.form,
  })
  const { form, setField, isDirty, canSubmit, isPending, commitCreate, resetToSeed } = create

  // Display-only snapshots for the picker triggers + starting-stock unit suffix.
  // Seeded from the source row when duplicating so the triggers read correctly
  // before the user touches the pickers.
  const [productLabel, setProductLabel] = useState<string | null>(seed?.productLabel ?? null)
  const [warehouseLabel, setWarehouseLabel] = useState<string | null>(seed?.warehouseLabel ?? null)
  const [stockUnitAbbrev, setStockUnitAbbrev] = useState<string>(seed?.stockUnitAbbrev ?? "")

  // Register dirtiness with the page so the scaffold's leave-guard fires when
  // navigating away with unsaved edits.
  useEffect(() => {
    page.setDirtySections(isDirty ? [CREATE_DIRTY_SECTION] : [])
  }, [isDirty, page])

  const handleProductSelected = (option: ProductOption | null) => {
    setProductLabel(option?.name ?? null)
    setStockUnitAbbrev(option?.stockUnitAbbrev ?? "")
  }

  const handleWarehouseSelected = (option: WarehouseOption | null) => {
    setWarehouseLabel(option?.name ?? null)
  }

  const handleCreate = () => {
    commitCreate({
      onSuccess: (created) => {
        page.setDirtySections([])
        router.push(buildInventoryRecordHref({ inventoryId: created.id }))
      },
      onError: (err) => setError(getClientErrorMessage(err, "Failed to create inventory")),
    })
  }

  const actions: RecordSectionSubHeaderAction[] = [
    {
      key: "back",
      label: "Back",
      tone: "neutral",
      onClick: page.closePage,
      disabled: isPending,
    },
    {
      key: "create",
      label: isPending ? "Creating…" : "Create",
      tone: "primary",
      onClick: handleCreate,
      disabled: !canSubmit || isPending,
    },
    {
      key: "discard",
      label: "Discard",
      tone: "neutral",
      onClick: resetToSeed,
      disabled: !isDirty || isPending,
    },
  ]

  return (
    // The record-view engine's field-section primitive — its sub-header +
    // grey body surface (TableBleed + section body surface) is the standard
    // form chrome every record-view form uses (cf. the work-orders create form).
    // `canManage={false}` hides the section's own Save/Discard; the create flow's
    // Back / Create / Discard ride in via `actions`.
    <RecordFieldSection
      title="New Inventory"
      showHeader={false}
      canManage={false}
      isDirty={isDirty}
      isSaving={isPending}
      hasConflict={false}
      error={error}
      onSave={() => undefined}
      onDiscard={resetToSeed}
      actions={actions}
    >
      <InventoryCreateFields
        form={form}
        setField={setField}
        editable={!isPending}
        productLabel={productLabel}
        warehouseLabel={warehouseLabel}
        stockUnitAbbrev={stockUnitAbbrev}
        onProductSelected={handleProductSelected}
        onWarehouseSelected={handleWarehouseSelected}
      />
    </RecordFieldSection>
  )
}

export function InventoryCreateClient({
  backHref,
  seed,
  title = "New Inventory",
}: {
  backHref: string
  seed?: InventoryCreateSeed
  title?: string
}) {
  return (
    <RecordCreateClientScaffold
      title={title}
      backHref={backHref}
      dirtyMessage="You have unsaved inventory changes. Leave this form without saving?"
    >
      {(page) => <InventoryCreatePanel page={page} seed={seed} />}
    </RecordCreateClientScaffold>
  )
}
