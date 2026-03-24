"use client"

import { FormStatusNotices } from "@/features/flooring/shared/ui/feedback/notices"
import { RecordFormField } from "@/features/flooring/shared/ui/forms/record-form"
import { RecordPanelFooter } from "@/features/flooring/shared/ui/forms/record-panel-footer"
import { RecordDetailPageShell } from "@/features/flooring/shared/ui/record-page/record-detail-page-shell"
import { PRIMARY_RECORD_PANEL_WIDTH_CLASS } from "@/features/flooring/shared/ui/record-page/record-panel-width"
import { CutLogsEditor } from "@/features/flooring/shared/ui/record-items/cut-logs-editor"
import { useInventoryRecordController } from "@/features/flooring/inventory/controllers/use-inventory-record-controller"
import type { InventoryRow, LocationOption } from "@/features/flooring/inventory/domain/types"
import { InventoryHeaderActions } from "./inventory-header-actions"
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
  const {
    record,
    notices,
    editLocationId,
    setEditLocationId,
    cutLogDraft,
    setCutLogDraftField,
    isBusy,
    isSavingCutLog,
    deletingCutLogId,
    availableLocationOptions,
    activeWarehouseName,
    activeSectionName,
    closeDetail,
    saveInventory,
    deleteInventory,
    addCutLog,
    deleteCutLog,
    canSubmitCutLog,
    cutPreviewAfter,
    activeRunningBalance,
    lowBalanceWarning,
    inventorySummary,
  } = useInventoryRecordController({
    initialRecord,
    locationOptions,
    backHref,
  })

  return (
    <RecordDetailPageShell
      title={`Inventory ${record.itemNumber}`}
      backHref={backHref}
      onBack={closeDetail}
      sizeClass={PRIMARY_RECORD_PANEL_WIDTH_CLASS}
      headerActions={<InventoryHeaderActions row={record} />}
    >
      <div className="space-y-6">
        <FormStatusNotices message={notices.message} error={notices.error} />

        <InventorySnapshotGrid summary={inventorySummary} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          <RecordFormField label="Section">
            <input
              value={activeSectionName || ""}
              readOnly
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
            />
          </RecordFormField>
          <RecordFormField label="Import Warehouse">
            <input
              value={activeWarehouseName || ""}
              readOnly
              className="rounded-lg border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-2 text-[var(--foreground)]/75"
            />
          </RecordFormField>
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
          submitLabel="Add"
        />

        {lowBalanceWarning ? (
          <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700">
            {lowBalanceWarning}
          </p>
        ) : null}

        <RecordPanelFooter
          deleteLabel="Delete Inventory"
          deleteConfirmMessage="Delete this inventory row?"
          onDelete={() => void deleteInventory()}
          onClose={closeDetail}
          saveLabel="Save Inventory"
          savingLabel="Saving..."
          onSave={() => void saveInventory()}
          isSaving={isBusy}
        />
      </div>
    </RecordDetailPageShell>
  )
}
