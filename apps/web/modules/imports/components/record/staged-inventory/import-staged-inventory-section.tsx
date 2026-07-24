"use client"

import { useMemo } from "react"
import { useSearchParams } from "next/navigation"
import {
  ConfirmDialog,
  RecordItemSection,
  useRecordSectionToggle,
  type RecordSectionToggleSide,
} from "@/engines/record-view"
import { WarningNotice } from "@/engines/common"
import type {
  FlooringStagedRowStatus,
  StagedInventoryFilterRow,
  StagedInventoryRow,
} from "@builders/domain"
import type { useImportStagedInventorySection } from "@/modules/imports/controllers/record/staged-inventory/use-import-staged-inventory-section"
import { buildServerStatusMap } from "@/modules/imports/controllers/record/drafts"
import { ImportPlannedImportsGrid } from "./import-planned-imports-grid"
import { ImportStagedInventoryGrid } from "./import-staged-inventory-grid"
import { StagedInventorySelectionCluster } from "./toolbar-controls"

/** Which view the single section is showing. Staged Inventory (operational) is default. */
type SectionMode = "planned" | "staged"

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

  // Both views share ONE atomic draft slice ({ filters, stagedRows }) + one
  // isDirty, so a draft left in one view would otherwise bleed into the other
  // (e.g. a Planned Import draft persisting while you add Staged rows, then
  // surfacing as a stray "pending save"). The shared section-toggle contract
  // discards this section's drafts on confirm before flipping, so an unsaved
  // view can't ride the toggle. Both sides point at the same section draft.
  //
  // Default to Staged Inventory (the operational view); honor `?view=planned`
  // so an external entry can land on the planning view. Read once at mount —
  // the section is keyed on the record id upstream, so stepping to a neighbor
  // remounts + re-reads without yanking the view from under an in-progress edit.
  const searchParams = useSearchParams()
  const sides: readonly [
    RecordSectionToggleSide<SectionMode>,
    RecordSectionToggleSide<SectionMode>,
  ] = [
    {
      key: "planned",
      label: "Planned Imports",
      accent: "border-emerald-500/60 bg-emerald-500/10 text-emerald-800",
      isDirty: section.isDirty,
      onDiscard: section.discard,
    },
    {
      key: "staged",
      label: "Staged Inventory",
      accent: "border-sky-500/60 bg-sky-500/10 text-sky-800",
      isDirty: section.isDirty,
      onDiscard: section.discard,
    },
  ]

  const { mode, activeLabel, stepper, dialogProps } = useRecordSectionToggle<SectionMode>({
    initialMode: searchParams.get("view") === "planned" ? "planned" : "staged",
    sides,
  })

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
          // Staged rows are added per-product via the "+" in each group header
          // (the product must already be on Planned Imports). No section-level add.
          actions: saveDiscardActions,
        }

  return (
    <>
      <RecordItemSection
        title={activeLabel}
        flush
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
    </>
  )
}
