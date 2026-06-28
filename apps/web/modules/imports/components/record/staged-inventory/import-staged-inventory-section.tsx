"use client"

import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  ConfirmDialog,
  RecordItemSection,
  RecordStepper,
  useRecordSwapGuard,
} from "@/engines/record-view"
import { WarningNotice } from "@/engines/common"
import type {
  FlooringStagedRowStatus,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import type { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import { buildServerStatusMap } from "@/modules/imports/controllers/record/drafts"
import { AddStagedInventoryModal } from "./add-staged-inventory-modal"
import { ImportPlannedImportsGrid } from "./import-planned-imports-grid"
import { ImportStagedInventoryGrid } from "./import-staged-inventory-grid"
import { StagedInventorySelectionCluster } from "./toolbar-controls"

/** Which view the single section is showing. Staged Inventory (operational) is default. */
type SectionMode = "planned" | "staged"

const MODE_LABEL: Record<SectionMode, string> = {
  planned: "Planned Imports",
  staged: "Staged Inventory",
}

// Mode accent: emerald = planning (Planned Imports), sky = operational (Staged Inventory).
const MODE_ACCENT: Record<SectionMode, string> = {
  planned: "border-emerald-500/60 bg-emerald-500/10 text-emerald-800",
  staged: "border-sky-500/60 bg-sky-500/10 text-sky-800",
}

export function ImportStagedInventorySection({
  section,
  filterRows,
  stagedRows,
  pollExhausted,
}: {
  section: ReturnType<typeof useImportStagedInventorySection>
  filterRows: StagedInventoryFilterRow[]
  stagedRows: StagedInventoryRow[]
  /**
   * The record controller's queued→imported poll gave up (bounded after ~2
   * min) with rows still QUEUED — likely a stuck worker job. Surface a soft
   * "refresh to check" hint rather than spinning forever.
   */
  pollExhausted: boolean
}) {
  // Default to Staged Inventory (the operational view); honor `?view=planned`
  // so an external entry can land on the planning view. Read once at mount —
  // the section is keyed on the record id upstream, so stepping to a neighbor
  // remounts + re-reads without yanking the view from under an in-progress edit.
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<SectionMode>(
    searchParams.get("view") === "planned" ? "planned" : "staged",
  )
  // Section-level "Add Staged Inventory" create modal. Mounted only while open so
  // its find/form state resets each time.
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  // Server snapshots: category labels (product picker) + live row status (the
  // worker flips QUEUED → IMPORTED without bumping the parent, so status is
  // sourced from the server snapshot, not the editable draft).
  const serverFilterRowsById = useMemo(() => {
    const map = new Map<string, StagedInventoryFilterRow>()
    for (const row of filterRows) map.set(row.id, row)
    return map
  }, [filterRows])
  const serverStatusById = useMemo<Map<string, FlooringStagedRowStatus>>(
    () => buildServerStatusMap(stagedRows),
    [stagedRows],
  )

  const filterCount = section.localValue.filters.length
  const stagedCount = section.localValue.stagedRows.length
  const selectedCount = section.selectedIds.size
  const eligibleSelectedCount = section.eligibleSelectedIds.length
  const sectionError = section.error?.message ?? null

  // Both views are editable, so flipping a dirty section warns first — but the
  // flip KEEPS the edits (they persist until save or leaving the import), so the
  // copy is switch-flavored, not discard-flavored.
  const { guard, dialogProps } = useRecordSwapGuard({
    isDirty: section.isDirty,
    title: "Switch view?",
    discardMessage:
      "This section has unsaved changes. Switch views? Your edits stay until you save or leave the import.",
    confirmLabel: "Switch & keep editing",
    cancelLabel: "Stay here",
  })

  const flipMode = useCallback(() => {
    guard(() => setMode((prev) => (prev === "planned" ? "staged" : "planned")))
  }, [guard])

  const stepper = (
    <RecordStepper
      label={MODE_LABEL[mode]}
      onPrevious={flipMode}
      onNext={flipMode}
      previousAriaLabel="Show the other view"
      nextAriaLabel="Show the other view"
      accent={MODE_ACCENT[mode]}
    />
  )

  const statusLeading = (
    <span className="inline-flex items-center rounded-xl border border-[rgba(58,58,58,0.72)] bg-[var(--panel-hover)] px-3 py-2 text-sm text-[var(--foreground)]/75">
      {filterCount} planned import{filterCount === 1 ? "" : "s"} · {stagedCount} staged row
      {stagedCount === 1 ? "" : "s"}
      {selectedCount > 0
        ? ` · ${selectedCount} selected (${eligibleSelectedCount} eligible)`
        : ""}
    </span>
  )

  // Save/Discard carry the imports-only extra guards (marking + selection), so
  // they render as custom actions (canManage:false) rather than the managed pair.
  const saveDiscardActions = [
    {
      key: "save",
      label: section.isSaving ? "Saving..." : "Save",
      kind: "custom" as const,
      tone: "primary" as const,
      onClick: () => void section.save(),
      disabled:
        !section.isDirty ||
        section.isSaving ||
        section.hasConflict ||
        section.isMarking ||
        section.isSelectionActive,
    },
    {
      key: "discard",
      label: "Discard",
      kind: "custom" as const,
      tone: "neutral" as const,
      onClick: () => section.discard(),
      disabled:
        !section.isDirty || section.isSaving || section.isMarking || section.isSelectionActive,
    },
  ]

  const subHeader =
    mode === "planned"
      ? {
          canManage: false as const,
          statusLeading,
          isDirty: section.isDirty,
          isSaving: section.isSaving,
          hasConflict: section.hasConflict,
          error: sectionError ?? section.noticeError,
          actionsLeading: stepper,
          actions: [
            ...saveDiscardActions,
            {
              key: "add",
              label: "Add Planned Import",
              kind: "add-row" as const,
              tone: "neutral" as const,
              onClick: section.addFilterRow,
              disabled:
                section.isSaving || section.isMarking || section.isSelectionActive,
            },
          ],
        }
      : {
          canManage: false as const,
          statusLeading,
          isDirty: section.isDirty,
          isSaving: section.isSaving,
          hasConflict: section.hasConflict,
          error: sectionError ?? section.markError ?? section.noticeError,
          actionsLeading: (
            <div className="flex items-center gap-2">
              {stepper}
              <StagedInventorySelectionCluster
                selection={{
                  isSelectionActive: section.isSelectionActive,
                  selectedCount,
                  eligibleCount: section.eligibleCount,
                  canToggleSelection: section.canToggleSelection,
                  onToggleSelection: section.toggleAllEligible,
                }}
                runImport={{
                  eligibleSelectedCount,
                  isMarking: section.isMarking,
                  isSaving: section.isSaving,
                  isDirty: section.isDirty,
                  onRunImport: () => void section.markForImport(),
                }}
              />
            </div>
          ),
          actions: [
            ...saveDiscardActions,
            {
              key: "add",
              label: "Add Staged Inventory",
              kind: "add-row" as const,
              tone: "neutral" as const,
              onClick: () => setIsAddModalOpen(true),
              disabled:
                section.isSaving || section.isMarking || section.isSelectionActive,
            },
          ],
        }

  return (
    <>
      <RecordItemSection
        title={MODE_LABEL[mode]}
        capabilities={{ editable: true, supportsSaveDiscard: true, supportsAddRow: true }}
        noticeMessage={section.noticeMessage}
        subHeader={subHeader}
      >
        {pollExhausted ? (
          <WarningNotice className="mb-3">
            Some rows are still importing in the background. Refresh the page to check their status.
          </WarningNotice>
        ) : null}
        {mode === "planned" ? (
          <ImportPlannedImportsGrid
            section={section}
            serverFilterRowsById={serverFilterRowsById}
          />
        ) : (
          <ImportStagedInventoryGrid section={section} serverStatusById={serverStatusById} />
        )}
      </RecordItemSection>

      <ConfirmDialog {...dialogProps} />

      {isAddModalOpen ? (
        <AddStagedInventoryModal
          onClose={() => setIsAddModalOpen(false)}
          onAdd={section.addStagedRowFromModal}
        />
      ) : null}
    </>
  )
}
