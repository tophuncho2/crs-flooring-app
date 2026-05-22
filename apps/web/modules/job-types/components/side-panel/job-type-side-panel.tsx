"use client"

import { useMemo, type ReactNode } from "react"
import {
  HubSidePanelEditToolbar,
  HubSidePanelShell,
} from "@/components/hub-side-panel"
import { CellAt } from "@/components/layout-grid"
import { FieldSection, FormField } from "@/components/fields"
import { TextCell } from "@/components/cells"
import type { JobTypeSidePanelController } from "@/modules/job-types/controllers/side-panel"

export type JobTypeSidePanelProps = {
  controller: JobTypeSidePanelController
}

/**
 * Right-anchored side panel for creating and editing job types. One
 * editable field (name). Save / Discard / Delete live in the sticky
 * edit toolbar — Delete is only rendered in edit mode. The 409
 * blocked-by-in-use response from the API surfaces in the toolbar
 * error region; the row is preserved.
 */
export function JobTypeSidePanel({ controller }: JobTypeSidePanelProps) {
  const {
    isOpen,
    mode,
    form,
    isDirty,
    isSaving,
    canSave,
    validationError,
    error,
    save,
    discard,
    close,
    setName,
    delete: deleteJobType,
  } = controller

  const errorMessage = validationError ?? error ?? null
  const editable = !isSaving

  const title = useMemo<ReactNode>(() => {
    if (mode.kind === "create") return "New job type"
    if (mode.kind === "edit") return form.name || "Job type"
    return "Job type"
  }, [mode.kind, form.name])

  const topToolbar = useMemo<ReactNode>(() => {
    if (mode.kind === "create") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          saveLabel="Create"
          savingLabel="Creating…"
          errorMessage={errorMessage}
        />
      )
    }
    if (mode.kind === "edit") {
      return (
        <HubSidePanelEditToolbar
          isDirty={isDirty}
          isSaving={isSaving}
          canSave={canSave}
          onSave={save}
          onDiscard={discard}
          onDelete={deleteJobType}
          errorMessage={errorMessage}
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
    deleteJobType,
    errorMessage,
  ])

  return (
    <HubSidePanelShell
      open={isOpen}
      onClose={close}
      title={title}
      topToolbar={topToolbar}
    >
      <FieldSection gap="0.75rem">
        <CellAt col={1} colSpan={8}>
          <FormField label="Name" required>
            <TextCell
              editable={editable}
              value={form.name}
              onChange={setName}
              placeholder="Job type name"
              ariaLabel="Job type name"
            />
          </FormField>
        </CellAt>
      </FieldSection>
    </HubSidePanelShell>
  )
}
