"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable, DebouncedSearchControl } from "@/engines/list-view"
import {
  RecordCreateClientScaffold,
  RecordFieldSection,
  RecordReferenceHeader,
  type RecordDetailClientScaffoldContext,
  type RecordSectionSubHeaderAction,
} from "@/engines/record-view"
import { buildInventoryRecordHref } from "@/hooks/navigation"
import { getClientErrorMessage } from "@/transport"
import { ProductPicker } from "@/modules/products/components/picker/product-picker"
import { useInventoryMergeSection } from "@/modules/inventory/controllers/record/merge/use-inventory-merge-section"
import { INVENTORY_LIST_COLUMNS } from "../../list/table/inventory-list-columns"
import { renderInventoryRowCell } from "../../list/table/inventory-row-cell"
import { InventoryMergeFields } from "./inventory-merge-fields"

/** Dirty-section label surfaced in the scaffold's leave-guard message. */
const MERGE_DIRTY_SECTION = "merge"

/**
 * The "merge inventory" flow as its own page (mirrors the create / duplicate
 * create flows — a create scaffold over a single section). The reference header
 * is a batch-select picker: a product scope, the four identity search bars, and
 * a multi-select candidate list (warehouse-agnostic). The form below seeds the
 * locked product + the derived Σ starting stock; a successful merge routes to
 * the new consolidated row's record page.
 */
function InventoryMergePanel({ page }: { page: RecordDetailClientScaffoldContext }) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const merge = useInventoryMergeSection({ clearError: () => setError(null) })
  const {
    productId,
    productLabel,
    warehouseLabel,
    stockUnitAbbrev,
    grid,
    selectedIds,
    selectedCount,
    summedStartingStock,
    isSelectionActive,
    eligibleCount,
    toggleRow,
    toggleAll,
    form,
    setField,
    setProduct,
    setWarehouse,
    isDirty,
    canSubmit,
    resetToSeed,
    isPending,
    commitMerge,
  } = merge

  useEffect(() => {
    page.setDirtySections(isDirty ? [MERGE_DIRTY_SECTION] : [])
  }, [isDirty, page])

  const handleMerge = () => {
    commitMerge({
      onSuccess: (created) => {
        page.setDirtySections([])
        router.push(buildInventoryRecordHref({ inventoryId: created.id }))
      },
      onError: (err) => setError(getClientErrorMessage(err, "Failed to merge inventory")),
    })
  }

  const actions: RecordSectionSubHeaderAction[] = [
    { key: "back", label: "Back", tone: "neutral", onClick: page.closePage, disabled: isPending },
    {
      key: "create",
      label: isPending ? "Merging…" : "Merge",
      tone: "primary",
      onClick: handleMerge,
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
    <div className="flex flex-col gap-4">
      <RecordReferenceHeader page={page} label="Inventory to merge">
        {() => (
          <div className="flex flex-col gap-3">
            <ProductPicker
              value={productId || null}
              selectedLabel={productLabel}
              onChange={() => {}}
              onOptionSelected={setProduct}
              placeholder="Select a product to merge"
              disabled={isPending}
              ariaLabel="Select a product to merge"
            />
            {productId ? (
              <>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <DebouncedSearchControl
                    value={grid.invNumber}
                    onCommit={grid.setInvNumber}
                    placeholder="Inv #"
                    ariaLabel="Search inventory by inventory number"
                  />
                  <DebouncedSearchControl
                    value={grid.rollNumber}
                    onCommit={grid.setRollNumber}
                    placeholder="Roll #"
                    ariaLabel="Search inventory by roll number"
                  />
                  <DebouncedSearchControl
                    value={grid.dyeLot}
                    onCommit={grid.setDyeLot}
                    placeholder="Dye lot"
                    ariaLabel="Search inventory by dye lot"
                  />
                  <DebouncedSearchControl
                    value={grid.note}
                    onCommit={grid.setNote}
                    placeholder="Note"
                    ariaLabel="Search inventory by note"
                  />
                </div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Archived, merged, and zero-balance rows aren&apos;t shown.
                </p>
                <DataTable
                  rows={grid.rows}
                  columns={INVENTORY_LIST_COLUMNS}
                  renderCell={renderInventoryRowCell}
                  getRowAriaLabel={(row) => row.inventoryItem}
                  selection={{
                    selectedIds,
                    onToggleRow: toggleRow,
                    isSelectionActive,
                    selectedCount,
                    eligibleCount,
                    onToggleAll: toggleAll,
                    canToggleSelection: !isPending,
                  }}
                  empty={grid.isLoading ? "Searching…" : (grid.error ?? "No matching inventory")}
                  pagination={grid.pagination}
                />
              </>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Pick a product to choose the rows to merge.
              </p>
            )}
          </div>
        )}
      </RecordReferenceHeader>

      {/* Record-view engine field-section primitive — sub-header + grey body
          surface, the standard form chrome (cf. the create form). Section
          Save/Discard are hidden (`canManage={false}`); Back / Merge / Discard
          ride in via `actions`. */}
      <RecordFieldSection
        title="Merge Inventory"
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
        <InventoryMergeFields
          form={form}
          setField={setField}
          setWarehouse={setWarehouse}
          editable={!isPending}
          productLabel={productLabel}
          warehouseLabel={warehouseLabel}
          stockUnitAbbrev={stockUnitAbbrev}
          summedStartingStock={summedStartingStock}
        />
      </RecordFieldSection>
    </div>
  )
}

export function InventoryMergeClient({ backHref }: { backHref: string }) {
  return (
    <RecordCreateClientScaffold
      title="Merge Inventory"
      backHref={backHref}
      dirtyMessage="You have an unfinished merge. Leave this form without saving?"
    >
      {(page) => <InventoryMergePanel page={page} />}
    </RecordCreateClientScaffold>
  )
}
