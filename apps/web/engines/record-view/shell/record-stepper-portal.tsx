"use client"

import { useCallback, useState, useSyncExternalStore } from "react"
import { createPortal } from "react-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ConfirmDialog } from "../dialogs/confirm-dialog"

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
  /** The current record's display number, shown between the arrows. */
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

const STEP_BUTTON_CLASS_NAME =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80 transition hover:border-blue-500/40 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--panel-border)] disabled:hover:text-[var(--foreground)]/80"

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
  const [pendingAction, setPendingAction] = useState<{ run: () => void } | null>(null)

  const guard = useCallback(
    (action: () => void) => {
      if (isDirty) setPendingAction({ run: action })
      else action()
    },
    [isDirty],
  )

  if (!target) return null

  return createPortal(
    <>
      <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] p-1">
        <button
          type="button"
          aria-label="Previous record"
          disabled={onPrevious === null}
          onClick={onPrevious ? () => guard(onPrevious) : undefined}
          className={STEP_BUTTON_CLASS_NAME}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="min-w-[4rem] px-1 text-center text-sm font-medium text-[var(--foreground)]/80">
          {label}
        </span>
        <button
          type="button"
          aria-label="Next record"
          disabled={onNext === null}
          onClick={onNext ? () => guard(onNext) : undefined}
          className={STEP_BUTTON_CLASS_NAME}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <ConfirmDialog
        open={pendingAction !== null}
        title="Discard unsaved changes?"
        message={discardMessage}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="warning"
        onConfirm={() => {
          pendingAction?.run()
          setPendingAction(null)
        }}
        onCancel={() => setPendingAction(null)}
      />
    </>,
    target,
  )
}
