"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditLayout,
  HubSidePanelEditToolbar,
  HubSidePanelPickerTrigger,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import type { CutLogEditPanelController } from "@/modules/cut-logs/controllers/cut-log-side-panel"
import { CutLogEditFormFields } from "./cut-log-edit-form-fields"
import { CutLogInventoryPickerTakeover } from "./pickers/cut-log-inventory-picker-takeover"
import { CutLogLocationPickerTakeover } from "./pickers/cut-log-location-picker-takeover"

const PICKER_LABEL_CLASS =
  "text-xs font-medium uppercase tracking-wide text-[var(--foreground)]/65"

export type CutLogEditPanelProps = {
  controller: CutLogEditPanelController
}

/**
 * Create-only cut-log side panel. Mounted by the work-orders record view
 * for the "+ Add Cut Log" and "Duplicate" affordances. Edit flows go
 * through `InventoryHubSidePanel` (see `modules/inventory/.../hub/`); the
 * controller still supports `mode: "edit"` because the hub embeds the
 * same controller — this component just doesn't render it.
 *
 * Body shape:
 *   - `HubSidePanelEditToolbar` (Create / Discard) pinned on top of the
 *     sticky topToolbar via `HubSidePanelEditLayout`, matching the read-only
 *     hub view and the other hub edit panels.
 *   - Location + Inventory `HubSidePanelPickerTrigger` buttons below it, still
 *     in the sticky topToolbar so they stay visible while a picker takeover
 *     fills the body below (template-sync pattern).
 *   - Cells (cut / notes / waste) in the body.
 *
 * Toolbar stays mounted (so the sticky header height and picker-trigger
 * positions don't shift) but is disabled while a picker takeover is active —
 * picker body owns its own search input + cancel-on-Escape behavior.
 */
export function CutLogEditPanel({ controller }: CutLogEditPanelProps) {
  const {
    open,
    pickerKind,
    isDirty,
    isSaving,
    error,
    save,
    discard,
    close,
    warehouseId,
    local,
  } = controller

  const create = open?.mode === "create" ? open : null
  const isOpen = create !== null
  const isPickerActive = pickerKind !== null

  const title = useMemo<ReactNode>(() => {
    if (isPickerActive) {
      if (pickerKind === "location") return "Select location"
      if (pickerKind === "inventory") return "Select inventory"
    }
    return "New cut log"
  }, [isPickerActive, pickerKind])

  // Picker triggers live in the sticky topToolbar so they stay visible
  // while the body swaps to a picker takeover. The triggers' `expanded`
  // flag tracks pickerKind so the active trigger highlights while its
  // picker fills the body below.
  const pickerTriggers = useMemo<ReactNode>(() => {
    if (!create) return null
    return (
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className={PICKER_LABEL_CLASS}>Location filter</span>
          <HubSidePanelPickerTrigger
            expanded={pickerKind === "location"}
            onToggle={() => controller.openPicker("location")}
            selectedLabel={local.locationFilter || null}
            placeholder="Select Location"
            disabled={isSaving || warehouseId === null}
            disabledPlaceholder={
              warehouseId === null ? "Select warehouse first" : undefined
            }
            ariaLabel="Open location filter picker"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={PICKER_LABEL_CLASS}>Inventory</span>
          <HubSidePanelPickerTrigger
            expanded={pickerKind === "inventory"}
            onToggle={() => controller.openPicker("inventory")}
            selectedLabel={local.pickedInventoryLabel || null}
            placeholder="Select Inventory"
            disabled={isSaving || warehouseId === null}
            disabledPlaceholder={
              warehouseId === null ? "Select warehouse first" : undefined
            }
            ariaLabel="Open inventory picker"
          />
        </label>
      </div>
    )
  }, [create, pickerKind, controller, local, isSaving, warehouseId])

  const topToolbar = useMemo<ReactNode>(() => {
    const actionsToolbar = create ? (
      <HubSidePanelEditToolbar
        isDirty={isDirty}
        isSaving={isSaving}
        canSave={isDirty}
        onSave={save}
        onDiscard={discard}
        saveLabel="Create"
        savingLabel="Creating…"
        errorMessage={error}
        disabled={isPickerActive}
      />
    ) : null
    if (!pickerTriggers && !actionsToolbar) return null
    return (
      <HubSidePanelEditLayout toolbar={actionsToolbar}>
        {pickerTriggers}
      </HubSidePanelEditLayout>
    )
  }, [create, isPickerActive, isDirty, isSaving, save, discard, error, pickerTriggers])

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {isPickerActive ? (
        pickerKind === "location" ? (
          <CutLogLocationPickerTakeover controller={controller} />
        ) : pickerKind === "inventory" ? (
          <CutLogInventoryPickerTakeover controller={controller} />
        ) : null
      ) : create ? (
        <CutLogEditFormFields mode="create" cutLog={null} controller={controller} />
      ) : null}
    </HubSidePanelShell>
  )
}
