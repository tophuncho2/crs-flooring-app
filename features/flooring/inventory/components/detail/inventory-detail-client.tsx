"use client"

import { useEffect } from "react"
import { useRecordPageController } from "@/features/flooring/shared/controllers/record-page/use-record-page-controller"
import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"
import { RecordDetailPageShell } from "@/features/flooring/shared/ui/record-page/record-detail-page-shell"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/ui/record-page/record-panel-width"
import { CutLogsEditor } from "@/features/flooring/shared/ui/record-items/cut-logs-editor"
import { useInventoryRecordController } from "@/features/flooring/inventory/controllers/use-inventory-record-controller"
import type { InventoryRow, LocationOption } from "@/features/flooring/inventory/domain/types"
import { InventoryHeaderActions } from "./inventory-header-actions"
import { InventoryHeaderMeta } from "./inventory-header-meta"
import { InventorySnapshotGrid } from "./inventory-snapshot-grid"

export function InventoryDetailClient({
  initialRecord,
  locationOptions,
  backHref,
}: {
  initialRecord: InventoryRow
  locationOptions: LocationOption[]
  backHref: string
}) {
  const { closePage, notices, redirectToBack, setIsDirty } = useRecordPageController({
    backHref,
    dirtyMessage: "You have unsaved inventory changes. Leave this inventory record without saving?",
  })
  const {
    record,
    isDirty,
    editLocationId,
    setEditLocationId,
    editItemNumber,
    setEditItemNumber,
    editDyeLot,
    setEditDyeLot,
    editCost,
    setEditCost,
    editFreight,
    setEditFreight,
    editNotes,
    setEditNotes,
    cutLogDraft,
    setCutLogDraftField,
    isBusy,
    isSavingCutLog,
    deletingCutLogId,
    availableLocationOptions,
    activeWarehouseName,
    saveInventory,
    deleteInventory,
    addCutLog,
    deleteCutLog,
    canSubmitCutLog,
    canCreateCutLogs,
    cutLogBlockedReason,
    cutPreviewAfter,
    activeRunningBalance,
    lowBalanceWarning,
    inventorySummary,
  } = useInventoryRecordController({
    initialRecord,
    locationOptions,
    notices,
    onDeleted: redirectToBack,
  })

  useEffect(() => {
    setIsDirty(isDirty)
  }, [isDirty, setIsDirty])

  return (
    <RecordDetailPageShell
      title={`Inventory ${record.itemNumber}`}
      backHref={backHref}
      onBack={closePage}
      sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
      headerMeta={(
        <InventoryHeaderMeta
          productName={record.productName}
          warehouseName={activeWarehouseName}
          importNumber={record.importNumber}
        />
      )}
      headerActions={<InventoryHeaderActions row={record} />}
    >
      <div className="space-y-6">
        <FormStatusNotices message={notices.message} error={notices.error} />

        <InventorySnapshotGrid summary={inventorySummary} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <RecordFormField label="Location">
            <select
              value={editLocationId}
              onChange={(event) => setEditLocationId(event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            >
              <option value="">Select Location</option>
              {availableLocationOptions.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.locationCode}
                </option>
              ))}
            </select>
          </RecordFormField>
          <RecordFormField label="Item #">
            <input
              value={editItemNumber}
              onChange={(event) => setEditItemNumber(event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Lot">
            <input
              value={editDyeLot}
              onChange={(event) => setEditDyeLot(event.target.value)}
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Cost">
            <input
              value={editCost}
              onChange={(event) => setEditCost(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <RecordFormField label="Freight">
            <input
              value={editFreight}
              onChange={(event) => setEditFreight(event.target.value)}
              inputMode="decimal"
              placeholder="0.00"
              className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
            />
          </RecordFormField>
          <div className="md:col-span-2 xl:col-span-5">
            <RecordFormField label="Notes">
              <textarea
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </RecordFormField>
          </div>
        </div>

        <CutLogsEditor
          items={record.cutLogs}
          draft={cutLogDraft}
          beforePreview={activeRunningBalance.toFixed(2)}
          afterPreview={cutPreviewAfter}
          unitLabel={record.stockUnit}
          adding={isSavingCutLog}
          deletingItemId={deletingCutLogId}
          onDraftChange={setCutLogDraftField}
          onAdd={() => addCutLog()}
          onDeleteItem={(itemId) => void deleteCutLog(itemId)}
          canSubmit={canSubmitCutLog}
          canCreate={canCreateCutLogs}
          submitLabel="Add"
        />

        {cutLogBlockedReason ? (
          <p className="rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-800">
            {cutLogBlockedReason}
          </p>
        ) : null}

        {lowBalanceWarning ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            {lowBalanceWarning}
          </p>
        ) : null}

        <RecordPanelFooter
          deleteLabel="Delete Inventory"
          deleteConfirmMessage="Delete this inventory row?"
          onDelete={() => void deleteInventory()}
          onClose={closePage}
          saveLabel="Save Inventory"
          savingLabel="Saving..."
          onSave={() => void saveInventory()}
          isSaving={isBusy}
        />
      </div>
    </RecordDetailPageShell>
  )
}
