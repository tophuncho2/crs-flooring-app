"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { ProductOption, WarehouseOption } from "@builders/domain"
import {
  RecordCreateClientScaffold,
  RecordSectionSubHeader,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { buildInventoryRecordHref } from "@/hooks/navigation"
import { getClientErrorMessage } from "@/transport"
import { useInventoryCreateSection } from "@/modules/inventory/controllers/record/create/use-inventory-create-section"
import { InventoryCreateFields } from "./inventory-create-fields"

/** Dirty-section label surfaced in the scaffold's leave-guard message. */
const CREATE_DIRTY_SECTION = "create"

/**
 * The manual "create inventory row" flow as its own page (mirrors the duplicate
 * create flow — a create scaffold over a single section). The user picks a
 * product + warehouse and fills the editable fields; on success a brand-new
 * row's record page opens.
 */
function InventoryCreatePanel({ page }: { page: RecordDetailClientScaffoldContext }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const create = useInventoryCreateSection({ clearError: () => setError(null) })
  const { form, setField, isDirty, canSubmit, isPending, commitCreate, resetToSeed } = create

  // Display-only snapshots for the picker triggers + starting-stock unit suffix.
  const [productLabel, setProductLabel] = useState<string | null>(null)
  const [warehouseLabel, setWarehouseLabel] = useState<string | null>(null)
  const [stockUnitAbbrev, setStockUnitAbbrev] = useState<string>("")

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
    <div className="flex flex-col gap-3 p-4">
      <RecordSectionSubHeader
        canManage={false}
        isDirty={isDirty}
        isSaving={isPending}
        hasConflict={false}
        error={error}
        actions={actions}
      />
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
    </div>
  )
}

export function InventoryCreateClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="New Inventory"
      backHref={backHref}
      dirtyMessage="You have unsaved inventory changes. Leave this form without saving?"
    >
      {(page) => <InventoryCreatePanel page={page} />}
    </RecordCreateClientScaffold>
  )
}
