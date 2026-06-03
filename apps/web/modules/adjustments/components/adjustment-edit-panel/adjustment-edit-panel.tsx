"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditLayout,
  HubSidePanelEditToolbar,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import type { AdjustmentEditPanelController } from "@/modules/adjustments/controllers/adjustment-side-panel"
import { AdjustmentEditFormFields } from "./adjustment-edit-form-fields"
import { AdjustmentPickerStack } from "./adjustment-picker-stack"
import { AdjustmentPickerTakeoverBody } from "./adjustment-picker-takeover-body"

export type AdjustmentEditPanelProps = {
  controller: AdjustmentEditPanelController
}

/**
 * Create-only adjustment side panel, mounted by the work-orders record view
 * for the "+ Add Adjustment" and "Duplicate" affordances. Edit flows go
 * through `InventoryHubSidePanel`; the controller still supports `mode: "edit"`
 * because the hub embeds the same controller — this component just doesn't
 * render it.
 *
 * Body shape: the shared `AdjustmentPickerStack` (Work order / Material item /
 * Warehouse / Inventory / Location, config-driven) sits in the sticky
 * `topToolbar` beneath the Create/Discard toolbar; the body is either the
 * active picker takeover or the editable cells.
 */
export function AdjustmentEditPanel({ controller }: AdjustmentEditPanelProps) {
  const { open, pickerKind, isDirty, isSaving, error, save, discard, close } = controller

  const create = open?.mode === "create" ? open : null
  const isOpen = create !== null
  const isPickerActive = pickerKind !== null

  const title = useMemo<ReactNode>(() => {
    if (isPickerActive) {
      if (pickerKind === "warehouse") return "Select warehouse"
      if (pickerKind === "inventory") return "Select inventory"
      if (pickerKind === "location") return "Select location"
      if (pickerKind === "workOrder") return "Select work order"
    }
    return "New adjustment"
  }, [isPickerActive, pickerKind])

  const topToolbar = useMemo<ReactNode>(() => {
    if (!create) return null
    const actionsToolbar = (
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
    )
    return (
      <HubSidePanelEditLayout toolbar={actionsToolbar}>
        <AdjustmentPickerStack controller={controller} />
      </HubSidePanelEditLayout>
    )
  }, [create, isPickerActive, isDirty, isSaving, save, discard, error, controller])

  return (
    <HubSidePanelShell open={isOpen} onClose={close} title={title} topToolbar={topToolbar}>
      {isPickerActive ? (
        <AdjustmentPickerTakeoverBody controller={controller} />
      ) : create ? (
        <AdjustmentEditFormFields mode="create" adjustment={null} controller={controller} />
      ) : null}
    </HubSidePanelShell>
  )
}
