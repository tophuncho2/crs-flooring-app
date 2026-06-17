"use client"

import { useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { ConfirmDialog } from "../dialogs/confirm-dialog"
import { useRecordSwapGuard } from "../client/hooks/use-record-swap-guard"
import { RecordStepper } from "./record-stepper"

const SLOT_ID = "record-stepper-slot"

const DEFAULT_DISCARD_MESSAGE =
  "This record has unsaved changes. Stepping to another record will discard them."

// The slot is owned by another subtree, so it can only be located after mount.
// useSyncExternalStore reads it on the client (getServerSnapshot returns null,
// matching SSR) without a synchronous setState-in-effect cascade. The slot
// reference is stable across renders, so this never loops. Mirrors the
// back-button / mode-notice portals.
function subscribe(): () => void {
  return () => {}
}

function getSlot(): HTMLElement | null {
  return document.getElementById(SLOT_ID)
}

function getServerSlot(): HTMLElement | null {
  return null
}

export type RecordStepperPortalProps = {
  /**
   * The current record's display number, shown between the arrows. Pass an empty
   * string while an in-flight step resolves (the neighbor's detail may be
   * uncached) — the stepper holds the last non-empty label so the control stays
   * steady instead of blanking. Keep the stepper mounted across that load and
   * disable the arrows (null callbacks) while it's pending.
   */
  label: string
  /** Step to the previous record. `null` disables the ◀ arrow (sequence edge). */
  onPrevious: (() => void) | null
  /** Step to the next record. `null` disables the ▶ arrow (sequence edge). */
  onNext: (() => void) | null
  /**
   * When true, a step defers behind the discard-confirm dialog (the record has
   * unsaved edits). Mirrors the reference header's record-swap guard — a step is
   * an in-place record swap, not a router navigation.
   */
  isDirty: boolean
  /** Discard-dialog body copy. */
  discardMessage?: string
}

/**
 * Record-view shell stepper: `◀ <label> ▶` painted into the global top bar's
 * `record-stepper-slot`, to the right of the mode notice. Walks the consumer
 * between sibling records — the arrows fire `onPrevious` / `onNext` (null = edge,
 * disabled). It owns the discard guard so stepping a dirty record prompts first,
 * matching the reference header's swap-discard contract.
 *
 * Dumb/passive: the consumer decides what "previous" / "next" mean and supplies
 * the label; this primitive carries no module logic.
 */
export function RecordStepperPortal({
  label,
  onPrevious,
  onNext,
  isDirty,
  discardMessage = DEFAULT_DISCARD_MESSAGE,
}: RecordStepperPortalProps) {
  const target = useSyncExternalStore(subscribe, getSlot, getServerSlot)
  const { guard, dialogProps } = useRecordSwapGuard({ isDirty, discardMessage })

  // Hold the last non-empty label so an in-flight step doesn't blank the control
  // while the neighbor's detail loads. A non-empty label renders immediately (no
  // lag); the retained value only fills the pending gap. Adjusting state during
  // render (React's documented pattern for derived-from-prior-render state) — the
  // guard makes it converge, never looping. The arrows still come straight from
  // the consumer (null = disabled during the pending step), so only the number is
  // retained, never stale navigation.
  const [lastLabel, setLastLabel] = useState(label)
  if (label && label !== lastLabel) setLastLabel(label)
  const displayLabel = label || lastLabel

  if (!target) return null

  return createPortal(
    <>
      <RecordStepper
        label={displayLabel}
        onPrevious={onPrevious ? () => guard(onPrevious) : null}
        onNext={onNext ? () => guard(onNext) : null}
        previousAriaLabel="Previous record"
        nextAriaLabel="Next record"
      />
      <ConfirmDialog {...dialogProps} />
    </>,
    target,
  )
}
