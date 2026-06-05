"use client"

import { useCallback, useEffect, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { EnrichedInventoryAdjustmentRow, InventoryDetail, InventoryForm } from "@builders/domain"
import {
  RecordDrilldownSection,
  RecordEntityFooter,
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
import { InventoryPrimaryFieldsSection } from "./primary/inventory-primary-fields-section"
import { InventoryAdjustmentsList } from "./adjustments/inventory-adjustments-list"
import { EmbeddedInventoryDuplicateView } from "./duplicate/embedded-inventory-duplicate-view"

/**
 * The inventory record view. ① editable inventory cells (primary — only Location
 * / Internal Notes / archive) · ② adjustments drilldown (a paginated list ⇄ the
 * embedded adjustment edit/create view, selection driven by the `?adjustment`
 * URL param the detail client owns) · the "Duplicate" primary action flips the
 * page into an embedded duplicate-create face (`?duplicate`). Mirrors the
 * Management Company record view.
 */
/** Sentinel `?adjustment` value that opens the embedded "new adjustment" form. */
const NEW_ADJUSTMENT_ID = "new"

export function InventoryRecordView({
  page,
  entry,
  selectedAdjustmentId,
  onSelectAdjustment,
  duplicateOpen,
  onToggleDuplicate,
}: {
  page: RecordDetailClientScaffoldContext
  entry: InventoryDetail
  selectedAdjustmentId: string | null
  onSelectAdjustment: (adjustmentId: string | null) => void
  duplicateOpen: boolean
  onToggleDuplicate: (open: boolean) => void
}) {
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
  const [duplicateDirty, setDuplicateDirty] = useState(false)
  const [selectedRow, setSelectedRow] = useState<EnrichedInventoryAdjustmentRow | null>(null)

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

  const handleToggleDuplicate = useCallback(
    (open: boolean) => {
      if (!open) setDuplicateDirty(false)
      onToggleDuplicate(open)
    },
    [onToggleDuplicate],
  )

  const sections: RecordPanelSectionConfig[] = [
    {
      key: "primary",
      type: "field",
      order: 0,
      slot: "primary",
      dirtyLabel: "inventory",
      controller: primary,
      visibleWhen: () => !duplicateOpen,
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
              onClick: () => handleToggleDuplicate(true),
              disabled: primary.isSaving,
            },
          ]}
        >
          <InventoryPrimaryFieldsSection
            inventory={record}
            draft={primary.localValue}
            warehouseName={record.warehouseName}
            editable={!primary.isSaving}
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
      visibleWhen: () => !duplicateOpen,
      render: (ctx) => (
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
              onCreate={() => {
                setSelectedRow(null)
                select(NEW_ADJUSTMENT_ID)
              }}
            />
          )}
          renderDetail={(_id, onBack) => (
            <EmbeddedAdjustmentRecordView
              controller={adjustments.panel}
              hostPage={ctx.page}
              onBack={onBack}
              onDirtyChange={setEmbeddedAdjustmentDirty}
            />
          )}
        />
      ),
    },
    {
      key: "duplicate",
      type: "item",
      order: 20,
      dirtyLabel: "duplicate",
      controller: { isDirty: duplicateDirty },
      visibleWhen: () => duplicateOpen,
      render: () => (
        <EmbeddedInventoryDuplicateView
          inventory={record}
          warehouseName={record.warehouseName}
          hostPage={page}
          onBack={() => handleToggleDuplicate(false)}
          onDirtyChange={setDuplicateDirty}
        />
      ),
    },
  ]

  return (
    <>
      <RecordMultiSectionPanel page={page} sections={sections} />
      <RecordEntityFooter
        onClose={page.closePage}
        onDelete={() => controller.deleteRecord()}
        deleteLabel="Delete Inventory"
        confirmTitle="Delete inventory?"
      />
    </>
  )
}
