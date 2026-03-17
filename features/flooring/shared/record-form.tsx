"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"

export function RecordModalShell({
  title,
  onClose,
  children,
  zIndexClass = "z-40",
}: {
  title: string
  onClose: () => void
  children: ReactNode
  zIndexClass?: string
}) {
  return (
    <div className={`fixed inset-0 ${zIndexClass} overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28`}>
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            >
              <X size={18} />
            </button>
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
