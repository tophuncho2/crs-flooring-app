"use client"

import { useCallback, useState } from "react"
import type { ReactNode } from "react"
import { RecordStepper } from "../../shell"
import type { ConfirmDialogProps } from "../../dialogs/confirm-dialog"
import { useRecordSwapGuard } from "./use-record-swap-guard"

/** One of the two sides a toggle section flips between. */
export type RecordSectionToggleSide<Mode extends string> = {
  /** Discriminant for this side (`"planned"`, `"staged"`, …). */
  key: Mode
  /** Label shown in the stepper (and reused for the section title). */
  label: string
  /** Accent classes for the stepper skin when this side is active. */
  accent: string
  /** Whether THIS side has unsaved edits — gates the confirm when it's the active side. */
  isDirty: boolean
  /** Discard THIS side's draft. Called before flipping away from it on confirm. */
  onDiscard: () => void
}

export type RecordSectionToggle<Mode extends string> = {
  mode: Mode
  /**
   * Raw, unguarded switch. Use for programmatic navigation (e.g. landing on a
   * side after a successful create) — it does NOT confirm or discard. User
   * toggles must go through `flipMode`.
   */
  setMode: (mode: Mode) => void
  /**
   * The user toggle: when the active side is dirty, confirm first, then discard
   * that side's draft and switch to the other side; when clean, switch instantly.
   */
  flipMode: () => void
  /** `sides[mode].label` — the active side's label, for the `RecordItemSection` title. */
  activeLabel: string
  /** A ready-built `RecordStepper` wired to `flipMode`; drop into `subHeader.actionsLeading`. */
  stepper: ReactNode
  /** Spread onto the single `<ConfirmDialog />` the consumer mounts. */
  dialogProps: ConfirmDialogProps
}

/**
 * The canonical record section-toggle host. A record-view section that flips
 * between two editable child grids via an inline stepper shares ONE contract:
 * **toggling away from a dirty side confirms, then discards that side's draft**,
 * so no unsaved edit ever survives a toggle (the hidden side is always clean).
 *
 * Composes the two engine pieces every such host already used — `useRecordSwapGuard`
 * (the confirm) + `RecordStepper` (the control) — and owns the 2-value mode state,
 * the flip-then-discard wiring, and the discard-flavored dialog copy. Each consumer
 * supplies both sides' `isDirty` + `onDiscard`; the hook picks the active side from
 * the mode it owns, so the section frame, subHeader, and grids stay in the module.
 */
export function useRecordSectionToggle<Mode extends string>({
  initialMode,
  sides,
  title = "Discard unsaved changes?",
  discardMessage = "Switching views discards this section's unsaved changes. Switch anyway?",
  confirmLabel = "Discard & switch",
  cancelLabel = "Stay here",
}: {
  /** The side to open on (consumers resolve any `?view=` seed and pass the key). */
  initialMode: Mode
  /** Exactly the two sides, in stable order — each carrying its own dirty + discard. */
  sides: readonly [RecordSectionToggleSide<Mode>, RecordSectionToggleSide<Mode>]
  /** Dialog copy overrides — default to the discard-flavored contract. */
  title?: string
  discardMessage?: string
  confirmLabel?: string
  cancelLabel?: string
}): RecordSectionToggle<Mode> {
  const [mode, setMode] = useState<Mode>(initialMode)

  const activeSide = sides[0].key === mode ? sides[0] : sides[1]
  const otherKey = sides[0].key === mode ? sides[1].key : sides[0].key
  const onDiscardActive = activeSide.onDiscard

  const { guard, dialogProps } = useRecordSwapGuard({
    isDirty: activeSide.isDirty,
    title,
    discardMessage,
    confirmLabel,
    cancelLabel,
  })

  const flipMode = useCallback(() => {
    guard(() => {
      onDiscardActive()
      setMode(otherKey)
    })
  }, [guard, onDiscardActive, otherKey])

  const stepper = (
    <RecordStepper
      label={activeSide.label}
      onPrevious={flipMode}
      onNext={flipMode}
      previousAriaLabel="Show the other view"
      nextAriaLabel="Show the other view"
      accent={activeSide.accent}
    />
  )

  return { mode, setMode, flipMode, activeLabel: activeSide.label, stepper, dialogProps }
}
