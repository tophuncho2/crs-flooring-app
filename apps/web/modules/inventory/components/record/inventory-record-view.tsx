"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail, InventoryForm } from "@builders/domain"
import {
  RecordDrilldownSection,
  RecordEntityFooter,
  RecordItemSection,
  RecordMultiSectionPanel,
  RecordPrimarySectionInstance,
  type RecordDetailClientScaffoldContext,
  type RecordPanelSectionConfig,
} from "@/engines/record-view"
import {
  INVENTORY_ADJUSTMENTS_QUERY_KEY,
  inventoryAdjustmentByIdRequest,
} from "@/modules/inventory/data/inventory-adjustments-request"
import { EmbeddedAdjustmentRecordView } from "./adjustments/embedded-adjustment-record-view"
import { useInventoryPrimarySection } from "@/modules/inventory/controllers/record/primary/use-inventory-primary-section"
import { useInventoryAdjustmentsSection } from "@/modules/inventory/controllers/record/adjustments/use-inventory-adjustments-section"
import { NEW_ADJUSTMENT_ID } from "@/modules/inventory/controllers/record/use-inventory-record-selection"
import { WarningNotice } from "@/engines/common"
import {
  buildInventoryRecordHref,
  buildInventorySplitOffHref,
  buildRecordCreateHref,
} from "@/hooks/navigation"
import { InventoryPrimaryFieldsSection } from "./primary/inventory-primary-fields-section"
import { InventoryAdjustmentsList } from "./adjustments/inventory-adjustments-list"
import { InventoryAdjustmentCreateModal } from "./adjustments/inventory-adjustment-create-modal"

/**
 * The inventory record view. ① editable inventory cells (primary — only Location
 * / Internal Notes / archive) · ② adjustments drilldown (a paginated list ⇄ the
 * embedded adjustment edit/create view, selection driven by the `?adjustment`
 * URL param the detail client owns). The "Duplicate" primary action opens the
 * inventory create form seeded from this row (`/dashboard/inventory/new?sourceId=`).
 * Mirrors the Management Company record view.
 */
export function InventoryRecordView({
  page,
  entry,
  selectedAdjustmentId,
  onSelectAdjustment,
}: {
  page: RecordDetailClientScaffoldContext
  entry: InventoryDetail
  selectedAdjustmentId: string | null
  onSelectAdjustment: (adjustmentId: string | null) => void
}) {
  const router = useRouter()
  const controller = useInventoryPrimarySection({ page, entry })
  const primary = controller.primarySection
  const record = controller.record

  const queryClient = useQueryClient()
  const handleAdjustmentMutated = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: [...INVENTORY_ADJUSTMENTS_QUERY_KEY, entry.id],
    })
    void controller.refreshRecord()
  }, [queryClient, entry.id, controller])

  const adjustments = useInventoryAdjustmentsSection({
    inventory: record,
    onMutated: handleAdjustmentMutated,
  })

  const [embeddedAdjustmentDirty, setEmbeddedAdjustmentDirty] = useState(false)
  const [selectedRow, setSelectedRow] = useState<EnrichedInventoryAdjustmentRow | null>(null)

  // Row ⋮ "Duplicate adjustment" opens a create modal locked to this inventory
  // (no picker grid), seeded from the source row. Null while closed.
  const [duplicateSource, setDuplicateSource] = useState<EnrichedInventoryAdjustmentRow | null>(
    null,
  )

  // Clear the bridged embedded-dirty flag as we leave the embedded adjustment,
  // so backing out of a (clean or discarded) adjustment doesn't leave the
  // inventory page falsely dirty (mirrors the MC `handleSelectProperty` reset).
  const handleSelectAdjustment = useCallback(
    (id: string | null) => {
      if (id === null) setEmbeddedAdjustmentDirty(false)
      onSelectAdjustment(id)
    },
    [onSelectAdjustment],
  )

  // "+ Adjustment" — drilldown into the create face. Mirrors the row-open path,
  // but with no source row to remember.
  const handleCreateAdjustment = useCallback(() => {
    setSelectedRow(null)
    handleSelectAdjustment(NEW_ADJUSTMENT_ID)
  }, [handleSelectAdjustment])

  // Cold deep-link (e.g. from the adjustments ledger): the URL carries an
  // adjustment id but the row isn't in memory (it may not be on the list's
  // first page). Resolve it by id so edit opens regardless of page.
  const needsFetch =
    selectedAdjustmentId !== null &&
    selectedAdjustmentId !== NEW_ADJUSTMENT_ID &&
    (!selectedRow || selectedRow.id !== selectedAdjustmentId)

  const byIdQuery = useQuery({
    enabled: needsFetch,
    queryKey: [...INVENTORY_ADJUSTMENTS_QUERY_KEY, entry.id, "by-id", selectedAdjustmentId],
    queryFn: ({ signal }) =>
      inventoryAdjustmentByIdRequest(entry.id, selectedAdjustmentId as string, signal),
  })

  const editRow =
    selectedRow && selectedRow.id === selectedAdjustmentId
      ? selectedRow
      : byIdQuery.data && byIdQuery.data.id === selectedAdjustmentId
        ? byIdQuery.data
        : null

  // Drive the shared adjustment controller from the URL selection. Keyed on the
  // selection + resolved row (NOT `controller.open`) so a mutation's same-row
  // refresh inside the controller is never clobbered.
  useEffect(() => {
    if (selectedAdjustmentId === null) {
      adjustments.panel.close()
    } else if (selectedAdjustmentId === NEW_ADJUSTMENT_ID) {
      adjustments.openCreate()
    } else if (editRow) {
      adjustments.openEdit(editRow)
    }
    // While a cold deep-link resolves, leave closed — the detail face shows a
    // loading stub until the by-id read returns.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAdjustmentId, editRow])

  // "Duplicate" leaves the record for the inventory create form, seeded with
  // this row as the source (`?sourceId=`). Guard the navigation so unsaved
  // primary edits prompt before we route away.
  const handleDuplicate = useCallback(() => {
    page.confirmNavigation(() => {
      router.push(buildRecordCreateHref("/dashboard/inventory", { params: { sourceId: entry.id } }))
    })
  }, [page, router, entry.id])

  // Split off: route to the inventory create form in split-off mode, seeded from
  // the given inventory with Starting Stock = the split quantity. `returnTo`
  // points back at the source inventory's record.
  const goToSplitOff = useCallback(
    ({ inventoryId, quantity }: { inventoryId: string; quantity: string }) => {
      router.push(
        buildInventorySplitOffHref({
          sourceInventoryId: inventoryId,
          quantity,
          returnTo: buildInventoryRecordHref({ inventoryId }),
        }),
      )
    },
    [router],
  )

  // Guarded variant for entry points that may leave unsaved edits behind (the
  // row ⋮ menu, the edit-toolbar button). "Save and split" skips the guard — it
  // routes only after a successful save, when the form is already clean.
  const confirmSplitOff = useCallback(
    (args: { inventoryId: string; quantity: string }) => {
      page.confirmNavigation(() => goToSplitOff(args))
    },
    [page, goToSplitOff],
  )

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "inventory",
      controller: primary,
      render: () => (
        <RecordPrimarySectionInstance
          title="Inventory"
          showHeader={false}
          error={primary.error}
          noticeMessage={primary.noticeMessage}
          noticeError={primary.noticeError}
          isDirty={primary.isDirty}
          isSaving={primary.isSaving}
          hasConflict={primary.hasConflict}
          onSave={() => void primary.save()}
          onDiscard={primary.discard}
          actions={[
            {
              key: "duplicate",
              label: "Duplicate",
              tone: "neutral",
              onClick: handleDuplicate,
              disabled: primary.isSaving,
            },
          ]}
        >
          <InventoryPrimaryFieldsSection
            draft={primary.localValue}
            record={record}
            warehouseName={record.warehouseName}
            // Lock the inventory fields while an adjustment is open below — the
            // operator is reading the inventory, not editing it.
            editable={!primary.isSaving && selectedAdjustmentId === null}
            onFieldChange={(field, value) =>
              primary.setLocalValue((previous: InventoryForm) => ({ ...previous, [field]: value }))
            }
          />
        </RecordPrimarySectionInstance>
      ),
    },
    {
      key: "adjustments",
      type: "item",
      order: 10,
      dirtyLabel: "adjustment",
      controller: { isDirty: embeddedAdjustmentDirty },
      render: (ctx) => (
        // Persistent section chrome: the blue "Adjustments" header + grey body
        // stay mounted across both faces — only the inner content swaps (the
        // DataTable list ⇄ the embedded edit cells). In list mode the section
        // toolbar carries "+ Adjustment"; in edit mode it's empty and the
        // embedded face supplies its own Save / Discard / Delete sub-header.
        <RecordItemSection
          title="Adjustments"
          subHeader={
            selectedAdjustmentId === null
              ? {
                  canManage: false,
                  showStatus: false,
                  isDirty: false,
                  isSaving: false,
                  hasConflict: false,
                  actions: [
                    {
                      key: "add-adjustment",
                      label: "+ Adjustment",
                      tone: "primary",
                      onClick: handleCreateAdjustment,
                    },
                  ],
                }
              : undefined
          }
        >
          <RecordDrilldownSection
            page={ctx.page}
            selectedId={selectedAdjustmentId}
            onSelect={handleSelectAdjustment}
            hideBackBar
            renderList={(select) => (
              <InventoryAdjustmentsList
                inventoryId={entry.id}
                onSelect={(row) => {
                  setSelectedRow(row)
                  select(row.id)
                }}
                onSplitOff={(row) =>
                  confirmSplitOff({ inventoryId: row.inventoryId, quantity: row.quantity })
                }
                onDuplicate={(row) => setDuplicateSource(row)}
              />
            )}
            renderDetail={(_id, onBack) => (
              <EmbeddedAdjustmentRecordView
                controller={adjustments.panel}
                hostPage={ctx.page}
                onBack={onBack}
                onDirtyChange={setEmbeddedAdjustmentDirty}
                onSplitAfterSave={goToSplitOff}
                onAddInventoryFromAdjustment={confirmSplitOff}
              />
            )}
          />
        </RecordItemSection>
      ),
    },
  ]

  return (
    <>
      {entry.wasMerged ? (
        <WarningNotice className="mb-4">
          This inventory item has been merged into another row. Editing it at this point may
          not reflect where its stock actually lives — edit at your own risk.
        </WarningNotice>
      ) : null}
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={() => controller.deleteRecord()}
        deleteLabel="Delete Inventory"
        confirmTitle="Delete inventory?"
      />
      {duplicateSource ? (
        <InventoryAdjustmentCreateModal
          inventory={record}
          source={duplicateSource}
          onClose={() => setDuplicateSource(null)}
          onCreated={() => {
            setDuplicateSource(null)
            handleAdjustmentMutated()
          }}
        />
      ) : null}
    </>
  )
}
