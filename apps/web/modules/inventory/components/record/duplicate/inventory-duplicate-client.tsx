"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import type { InventoryDetail } from "@builders/domain"
import {
  RecordCreateClientScaffold,
  RecordReferenceHeader,
  RecordSectionSubHeader,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { buildInventoryRecordHref } from "@/hooks/navigation"
import { getClientErrorMessage } from "@/transport"
import { useInventoryDuplicateSection } from "@/modules/inventory/controllers/record/duplicate/use-inventory-duplicate-section"
import { InventoryReferenceRow } from "../header/inventory-reference-row"
import { InventoryDuplicateFields } from "./inventory-duplicate-fields"

/** Dirty-section label surfaced in the scaffold's leave-guard message. */
const DUPLICATE_DIRTY_SECTION = "duplicate"

/**
 * The "duplicate inventory" create flow as its own page (mirrors
 * `WorkOrderCreateClient` — a create scaffold over a single section). Reuses the
 * shared `useInventoryDuplicateSection` slice + `InventoryDuplicateFields` (the
 * source row still renders read-only beneath the editable five fields). A
 * successful create routes to the new inventory item's record page.
 */
function InventoryDuplicatePanel({
  page,
  source,
}: {
  page: RecordDetailClientScaffoldContext
  source: InventoryDetail
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const duplicate = useInventoryDuplicateSection({ clearError: () => setError(null) })
  const { form, setField, isDirty, canSubmit, isPending, commitDuplicate, resetToSeed } = duplicate

  // Register dirtiness with the page so the scaffold's leave-guard fires when
  // navigating away (back arrow / Back action) with unsaved edits.
  useEffect(() => {
    page.setDirtySections(isDirty ? [DUPLICATE_DIRTY_SECTION] : [])
  }, [isDirty, page])

  const handleCreate = () => {
    commitDuplicate(source.id, {
      onSuccess: (created) => {
        page.setDirtySections([])
        router.push(buildInventoryRecordHref({ inventoryId: created.id }))
      },
      onError: (err) => setError(getClientErrorMessage(err, "Failed to duplicate inventory")),
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
      {/* Locked reference header — the source row in the same chrome the record
          view uses, sitting above the section controls; reselecting the
          reference is a later step. */}
      <RecordReferenceHeader page={page} label="Reference inventory">
        {() => <InventoryReferenceRow inventory={source} />}
      </RecordReferenceHeader>
      <RecordSectionSubHeader
        canManage={false}
        isDirty={isDirty}
        isSaving={isPending}
        hasConflict={false}
        error={error}
        actions={actions}
      />
      <InventoryDuplicateFields
        inventory={source}
        form={form}
        setField={setField}
        editable={!isPending}
      />
    </div>
  )
}

export function InventoryDuplicateClient({
  backHref,
  source,
}: {
  backHref: string
  source: InventoryDetail
}) {
  return (
    <RecordCreateClientScaffold
      title={`Duplicate ${source.inventoryItem}`}
      backHref={backHref}
      dirtyMessage="You have unsaved duplicate changes. Leave this form without saving?"
    >
      {(page) => <InventoryDuplicatePanel page={page} source={source} />}
    </RecordCreateClientScaffold>
  )
}
