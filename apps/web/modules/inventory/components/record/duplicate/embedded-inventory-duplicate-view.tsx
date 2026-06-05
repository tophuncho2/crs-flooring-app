"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { InventoryDetail } from "@builders/domain"
import {
  RecordSectionSubHeader,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { getClientErrorMessage } from "@/transport"
import { useHubInventoryDuplicate } from "@/modules/inventory/controllers/inventory-hub-side-panel/use-hub-inventory-duplicate"
import { InventoryDuplicateFields } from "./inventory-duplicate-fields"

/**
 * Embedded "duplicate inventory" create face, rendered inside the inventory
 * record view's duplicate section. Reuses the shared `useHubInventoryDuplicate`
 * slice; a successful create routes to the new inventory's own record page
 * (mirrors property-create). Chrome-less — a `RecordSectionSubHeader` action row
 * over the shared duplicate fields, with Back routed through the host guard.
 */
export function EmbeddedInventoryDuplicateView({
  inventory,
  warehouseName,
  hostPage,
  onBack,
  onDirtyChange,
}: {
  inventory: InventoryDetail
  warehouseName: string | null
  hostPage: RecordDetailClientScaffoldContext
  onBack: () => void
  onDirtyChange?: (dirty: boolean) => void
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const duplicate = useHubInventoryDuplicate({ clearError: () => setError(null) })
  const { form, setField, isDirty, canSubmit, isPending, commitDuplicate, resetToSeed } = duplicate

  // Bridge dirtiness up so the host section + page guard reflect it.
  useEffect(() => {
    onDirtyChange?.(isDirty)
  }, [isDirty, onDirtyChange])

  const handleCreate = () => {
    commitDuplicate(inventory.id, {
      onSuccess: (created) => {
        onDirtyChange?.(false)
        onBack()
        router.push(`/dashboard/inventory/${created.id}`)
      },
      onError: (err) => setError(getClientErrorMessage(err, "Failed to duplicate inventory")),
    })
  }

  const actions: RecordSectionSubHeaderAction[] = [
    {
      key: "back",
      label: "Back",
      tone: "neutral",
      onClick: () => hostPage.confirmNavigation(onBack),
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
      <InventoryDuplicateFields
        inventory={inventory}
        warehouseName={warehouseName}
        form={form}
        setField={setField}
        editable={!isPending}
      />
    </div>
  )
}
