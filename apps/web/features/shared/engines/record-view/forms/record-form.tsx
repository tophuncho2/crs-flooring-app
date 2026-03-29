"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"

export const RECORD_FIELD_CONTROL_CLASS_NAME = "w-full rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
export const RECORD_TEXTAREA_CONTROL_CLASS_NAME = `${RECORD_FIELD_CONTROL_CLASS_NAME} min-h-[42px] resize-y`
export const RECORD_PREFIXED_CONTROL_CONTAINER_CLASS_NAME =
  "flex w-full overflow-hidden rounded-lg border border-[var(--panel-border)] bg-transparent"
export const RECORD_PREFIX_CONTROL_CLASS_NAME =
  "inline-flex shrink-0 items-center border-r border-[var(--panel-border)] px-3 text-[var(--foreground)]/70"
export const RECORD_PREFIXED_CONTROL_INPUT_CLASS_NAME = "min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
export const RECORD_CURRENCY_PREFIX = "$"

export function RecordModalShell({
  title,
  onClose,
  children,
  zIndexClass = "z-40",
  zIndex,
  sizeClass = "max-w-5xl",
  headerMeta,
  headerActions,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  zIndexClass?: string
  zIndex?: number
  sizeClass?: string
  headerMeta?: ReactNode
  headerActions?: ReactNode
}) {
  return (
    <div
      className={`fixed inset-0 ${zIndexClass} overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28`}
      style={zIndex ? { zIndex } : undefined}
    >
      <div className="flex min-h-full items-start justify-center">
        <div
          className={`flex max-h-[calc(100vh-7rem)] w-full ${sizeClass} flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]`}
        >
          <div className="border-b border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-5 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.12)]">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="inline-flex w-fit max-w-full items-center rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] px-3 py-2">
                    <h2 className="truncate text-lg font-semibold">{title}</h2>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:justify-end">
                    {headerMeta ? <div className="min-w-0 flex-1">{headerMeta}</div> : null}
                    {headerActions ? <div className="shrink-0">{headerActions}</div> : null}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
              >
                <X size={18} />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function RecordFormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}
