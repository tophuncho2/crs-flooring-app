"use client"

import type { ReactNode } from "react"
import { RecordModal } from "./record-modal"

export type QuickCreateModalProps = {
  /** Controls visibility. When `false`, the modal is not rendered. */
  open: boolean
  /** Title rendered in the modal header. */
  title: ReactNode
  /** Form body — the cells/sections the host composes. Scrolls when tall. */
  children: ReactNode
  /** Fired by the close ✕, backdrop, Escape, and the footer Cancel button. */
  onClose: () => void
  /** Fired by the footer Create button (only when `canCreate` and not saving). */
  onCreate: () => void
  /** Gates the Create button — typically "required fields present". */
  canCreate: boolean
  /** In-flight flag — disables both footer buttons and swaps the Create label. */
  isSaving: boolean
  /** Optional error banner rendered above the footer buttons. */
  error?: string | null
  /** Create button label. Default `"Create"`. */
  createLabel?: string
  /** Create button label while saving. Default `"Creating…"`. */
  creatingLabel?: string
  /**
   * Optional secondary action rendered between Cancel and Create (e.g. a
   * "Save and split" that creates then routes elsewhere). The host owns its
   * gating + handler; omit it for the plain Cancel/Create footer.
   */
  secondaryAction?: {
    label: string
    onClick: () => void
    disabled?: boolean
  }
  /** Max card width forwarded to `RecordModal`. Default `"max-w-2xl"`. */
  widthClassName?: string
}

/**
 * The reusable "quick create" modal chrome — a {@link RecordModal} plus a
 * standardized Cancel/Create footer. The form-mounted-in-a-record-view pattern
 * first hand-rolled by the work-orders → adjustments modal, promoted here so any
 * record view can deploy an inline create form without re-building the footer.
 *
 * Pure chrome: the host supplies the form body (`children`) and owns the create
 * controller, passing `canCreate` / `isSaving` / `error` + the `onCreate` /
 * `onClose` handlers. On a successful create the host closes the modal itself
 * (e.g. inside its `onCreated` callback).
 */
export function QuickCreateModal({
  open,
  title,
  children,
  onClose,
  onCreate,
  canCreate,
  isSaving,
  error,
  createLabel = "Create",
  creatingLabel = "Creating…",
  secondaryAction,
  widthClassName,
}: QuickCreateModalProps) {
  const footer = (
    <div className="flex items-center justify-end gap-2">
      {error ? (
        <span className="mr-auto text-sm text-rose-600">{error}</span>
      ) : null}
      <button
        type="button"
        onClick={onClose}
        disabled={isSaving}
        className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)] disabled:opacity-50"
      >
        Cancel
      </button>
      {secondaryAction ? (
        <button
          type="button"
          onClick={secondaryAction.onClick}
          disabled={secondaryAction.disabled || isSaving}
          className="rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-sm font-medium text-[var(--foreground)]/80 transition hover:border-sky-500/45 hover:text-[var(--foreground)] disabled:opacity-50"
        >
          {secondaryAction.label}
        </button>
      ) : null}
      <button
        type="button"
        onClick={onCreate}
        disabled={!canCreate || isSaving}
        className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-sky-700 disabled:opacity-50"
      >
        {isSaving ? creatingLabel : createLabel}
      </button>
    </div>
  )

  return (
    <RecordModal
      open={open}
      title={title}
      onClose={onClose}
      footer={footer}
      widthClassName={widthClassName}
    >
      {children}
    </RecordModal>
  )
}
