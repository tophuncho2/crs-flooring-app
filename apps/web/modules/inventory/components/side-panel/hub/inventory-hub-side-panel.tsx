"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditToolbar,
  HubSidePanelPagination,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import {
  CutLogEditFinalizeButton,
  CutLogEditStatusPill,
  CutLogEditVoidButton,
} from "@/modules/cut-logs/components/cut-log-edit-panel/toolbar-controls"
import type { InventoryHubSidePanelController } from "@/modules/inventory/controllers/inventory-hub-side-panel"
import { InventoryHubCutLogEditSection } from "./inventory-hub-cut-log-edit-section"
import { InventoryHubCutLogsListSection } from "./inventory-hub-cut-logs-list-section"
import { InventoryHubInventoryEditSection } from "./inventory-hub-inventory-edit-section"
import { InventoryHubViewSection } from "./inventory-hub-view-section"

export type InventoryHubSidePanelProps = {
  controller: InventoryHubSidePanelController
}

/**
 * Right-anchored inventory hub side panel. Mirrors the property hub
 * pattern at `modules/properties/components/side-panel/hub/`:
 *
 *   - view: read-only cells card on top, paginated cut-logs list below
 *   - section-edit-inventory: editable cells with archive / location /
 *           internalNotes mutations; roll# / dye lot / note stay
 *           UI-blocked
 *   - section-edit-cut-log: cut-log readonly summary + cut / notes /
 *           waste editable cells; toolbar exposes Save / Discard /
 *           Finalize / Void / Delete + back-arrow
 *
 * Cut-log status transitions (Finalize / Void) live in the toolbar's
 * extra-left-actions slot so they read as section-scoped actions
 * alongside the back-arrow rather than mixing into Save / Discard /
 * Delete.
 */
export function InventoryHubSidePanel({ controller }: InventoryHubSidePanelProps) {
  const {
    isOpen,
    mode,
    inventory,
    cutLogs,
    cutLogPanel,
    isDirty,
    isSaving,
    canSave,
    error,
    save,
    discard,
    close,
    exitToView,
  } = controller

  const cutLog =
    cutLogPanel.open?.mode === "edit" ? cutLogPanel.open.cutLog : null

  const title = useMemo<ReactNode>(() => {
    switch (mode.kind) {
      case "section-edit-cut-log":
        return cutLog?.cutLogNumber ?? "Cut log"
      case "section-edit-inventory":
      case "view":
        return inventory.inventoryItem || "Inventory"
      default:
        return "Inventory"
    }
  }, [mode.kind, cutLog, inventory.inventoryItem])

  const cutLogExtraLeftActions = useMemo<ReactNode>(() => {
    if (mode.kind !== "section-edit-cut-log") return null
    return (
      <>
        <CutLogEditFinalizeButton controller={cutLogPanel} mode="edit" />
        <CutLogEditVoidButton controller={cutLogPanel} mode="edit" />
        <CutLogEditStatusPill controller={cutLogPanel} />
      </>
    )
  }, [mode.kind, cutLogPanel])

  const topToolbar = useMemo<ReactNode>(() => {
    if (mode.kind === "section-edit-inventory") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onOpenHubView={exitToView}
          errorMessage={error}
        />
      )
    }
    if (mode.kind === "section-edit-cut-log") {
      // Cut-log save/discard are routed through the hub coordinator so
      // the section-busy + dirty derivations stay coherent. Delete +
      // finalize + void are wired straight to the embedded panel —
      // they're domain-specific cut-log actions with their own
      // visibility rules (Finalize on PENDING, Void on FINAL not voided,
      // Delete on PENDING only). The embedded buttons already encode
      // those rules and render null otherwise.
      const onDelete = cutLog ? cutLogPanel.deleteCutLog : undefined
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onDelete={onDelete}
          onOpenHubView={exitToView}
          extraLeftActions={cutLogExtraLeftActions}
          errorMessage={error ?? cutLogPanel.error ?? null}
        />
      )
    }
    if (mode.kind === "view") {
      const showPagination = cutLogs.hasData && cutLogs.total > cutLogs.pageSize
      if (!showPagination) return null
      return (
        <HubSidePanelPagination
          page={cutLogs.page}
          totalPages={cutLogs.totalPages}
          total={cutLogs.total}
          totalLabel="cut logs"
          canPrev={cutLogs.canPrev}
          canNext={cutLogs.canNext}
          onGoPrev={cutLogs.goPrev}
          onGoNext={cutLogs.goNext}
        />
      )
    }
    return null
  }, [
    mode.kind,
    isDirty,
    isSaving,
    canSave,
    save,
    discard,
    exitToView,
    error,
    cutLog,
    cutLogPanel,
    cutLogExtraLeftActions,
    cutLogs,
  ])

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {mode.kind === "view" ? (
        <div className="flex flex-col gap-5">
          <InventoryHubViewSection controller={controller} />
          <InventoryHubCutLogsListSection controller={controller} />
        </div>
      ) : mode.kind === "section-edit-inventory" ? (
        <InventoryHubInventoryEditSection controller={controller} />
      ) : mode.kind === "section-edit-cut-log" ? (
        <InventoryHubCutLogEditSection controller={controller} />
      ) : null}
    </HubSidePanelShell>
  )
}
