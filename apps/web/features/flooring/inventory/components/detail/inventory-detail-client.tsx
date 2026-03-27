"use client"

import { useEffect } from "react"
import { useRecordPageController } from "@/features/flooring/shared/controllers/record-page/use-record-page-controller"
import { FormStatusNotices } from "@/features/dashboard/shared/feedback/notices"
import {
  RECORD_CURRENCY_PREFIX,
  RECORD_FIELD_CONTROL_CLASS_NAME,
  RECORD_PREFIX_CONTROL_CLASS_NAME,
  RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME,
  RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME,
  RECORD_TEXTAREA_CONTROL_CLASS_NAME,
  RecordFormField,
} from "@/features/flooring/shared/ui/forms/record-form"
import { RecordPanelFooter } from "@/features/dashboard/shared/record-view/record-panel-footer"
import { RecordDetailPageShell } from "@/features/dashboard/shared/record-view/record-detail-page-shell"
import { CutLogsEditor } from "@/features/flooring/shared/line-items/cut-logs-editor"
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

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <RecordFormField label="Location">
            <select
              value={editLocationId}
              onChange={(event) => setEditLocationId(event.target.value)}
              className={RECORD_FIELD_CONTROL_CLASS_NAME}
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
              className={RECORD_FIELD_CONTROL_CLASS_NAME}
            />
          </RecordFormField>
          <RecordFormField label="Lot">
            <input
              value={editDyeLot}
              onChange={(event) => setEditDyeLot(event.target.value)}
              className={RECORD_FIELD_CONTROL_CLASS_NAME}
            />
          </RecordFormField>
          <RecordFormField label="Cost">
            <div className={RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME}>
              <span aria-hidden="true" className={RECORD_PREFIX_CONTROL_CLASS_NAME}>
                {RECORD_CURRENCY_PREFIX}
              </span>
              <input
                aria-label="Cost"
                value={editCost}
                onChange={(event) => setEditCost(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className={RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME}
              />
            </div>
          </RecordFormField>
          <RecordFormField label="Freight">
            <div className={RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME}>
              <span aria-hidden="true" className={RECORD_PREFIX_CONTROL_CLASS_NAME}>
                {RECORD_CURRENCY_PREFIX}
              </span>
              <input
                aria-label="Freight"
                value={editFreight}
                onChange={(event) => setEditFreight(event.target.value)}
                inputMode="decimal"
                placeholder="0.00"
                className={RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME}
              />
            </div>
          </RecordFormField>
          <div className="md:col-span-2 xl:col-span-2">
            <RecordFormField label="Notes">
              <textarea
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                rows={1}
                className={RECORD_TEXTAREA_CONTROL_CLASS_NAME}
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
