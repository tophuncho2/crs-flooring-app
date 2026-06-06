"use client"

import { useCallback, useState, type ReactNode } from "react"
import { ConfirmDialog } from "@/components/dialogs/confirm-dialog"
import type { RecordDetailClientScaffoldContext } from "../client/scaffolds/record-detail-client-scaffold"

/**
 * Handed to the header body (and actions) so every record-swapping selection
 * routes through one discard prompt. `guard(action)` defers `action` behind the
 * confirm dialog when the record is dirty, and runs it immediately otherwise.
 */
export type RecordReferenceHeaderApi = {
  guard: (action: () => void) => void
  isDirty: boolean
}

export type RecordReferenceHeaderProps = {
  /** The record page controller from `RecordDetailClientScaffold`'s render-prop. */
  page: RecordDetailClientScaffoldContext
  /**
   * The header body — the module's pickers / triggers. Receives the guard so
   * selecting a different record prompts a discard when the current one is dirty.
   */
  children: (api: RecordReferenceHeaderApi) => ReactNode
  /**
   * Optional section label. When supplied, the body is wrapped in the standard
   * labeled reference-header card with the `actions` slot top-right. When
   * omitted, the primitive draws no chrome — the children own their own layout
   * (e.g. the templates cascade triggers carry their own).
   */
  label?: string
  /** Optional right-aligned actions (Clear / +New). Receives the same guard. */
  actions?: (api: RecordReferenceHeaderApi) => ReactNode
  /** Discard-dialog body copy. */
  discardMessage?: string
}

const DEFAULT_DISCARD_MESSAGE =
  "This record has unsaved changes. Switching will discard them."

/**
 * The canonical record-view "reference header" primitive: the chrome that sits
 * atop the first section and lets the user change which record they're viewing.
 * It owns the dirty-guard + confirm-discard dialog so every consumer (inventory,
 * templates, …) shares one swap-discard contract instead of hand-rolling it.
 *
 * The in-place record swap is NOT a router navigation, so this dialog is
 * distinct from the scaffold's route-leave dialog (`page.dirtyLeaveDialogProps`);
 * both can be mounted without colliding.
 */
export function RecordReferenceHeader({
  page,
  children,
  label,
  actions,
  discardMessage = DEFAULT_DISCARD_MESSAGE,
}: RecordReferenceHeaderProps) {
  const isDirty = page.isDirty
  const [pendingAction, setPendingAction] = useState<{ run: () => void } | null>(null)

  const guard = useCallback(
    (action: () => void) => {
      if (isDirty) setPendingAction({ run: action })
      else action()
    },
    [isDirty],
  )

  const api: RecordReferenceHeaderApi = { guard, isDirty }

  const labeled = label !== undefined

  return (
    <>
      {labeled ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]/60">
              {label}
            </span>
            {actions ? <div className="flex items-center gap-2">{actions(api)}</div> : null}
          </div>
          {children(api)}
        </div>
      ) : (
        children(api)
      )}
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
    </>
  )
}
