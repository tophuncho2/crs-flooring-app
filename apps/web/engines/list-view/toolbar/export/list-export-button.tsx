"use client"

import { useMemo, useState } from "react"
import { Download, Sheet } from "lucide-react"
import { EXPORT_ROW_CAP_OPTIONS, type ExportRowCap } from "@builders/domain"
import { ToolbarMenuButton } from "../action-bar/toolbar-menu-button"

const CHECKBOX_CLASS =
  "h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] text-sky-600 focus:ring-1 focus:ring-sky-500/40"

// Protocol code the export routes return (HTTP 409) when the user hasn't granted
// the Google Drive scope yet. Mirrored verbatim from the server
// (`server/google/respond-with-sheet.ts`) — keep the two in sync.
const GOOGLE_REAUTH_CODE = "google_reauth_required"

type ExportFormat = "sheet" | "csv"

type ExportStatus =
  | { kind: "idle" }
  | { kind: "loading"; format: ExportFormat }
  | { kind: "done"; message: string; url?: string }
  | { kind: "error"; message: string }
  | { kind: "reauth"; message: string }

export type ListExportColumn = { key: string; label: string }

export type ListExportButtonProps = {
  /** Export endpoint, e.g. `/api/inventory/export`. */
  endpoint: string
  /** Current list query string (filters + sort), without leading `?`. */
  query: string
  /** Exportable columns ({ key, label }) — all checked by default. */
  columns: ReadonlyArray<ListExportColumn>
  /** Download filename for the CSV fallback, e.g. `inventory-export.csv`. */
  filename: string
  /**
   * Ticked row ids from the table's always-on selection column. When non-empty
   * the export is scoped to these ids; empty exports the whole filtered set.
   * Row selection now lives on the table itself (checkboxes + header select-all)
   * — this menu only reflects the current tick count, it no longer gates it.
   */
  selectedIds: ReadonlyArray<string>
  /**
   * Called when a Sheets export fails because the user hasn't granted the Google
   * Drive scope yet — the consumer requests it on demand (incremental auth). This
   * is the first-export path for most users, since sign-in asks for identity only.
   * Optional: without it the connect message shows but has no action button.
   */
  onReauthRequired?: () => void
}

function capLabel(cap: ExportRowCap): string {
  return cap === "all" ? "All" : cap.toLocaleString()
}

/**
 * The right-cluster "Export" tool: a {@link ToolbarMenuButton} whose popover
 * hosts the column-picker checkboxes, a row-cap dropdown, and two actions —
 * the primary **Open in Google Sheets** (creates a Sheet in the user's Drive and
 * opens it) and a secondary **Download CSV** (the file fallback). Row selection is
 * not gated here — checkboxes live on the table itself — so this menu just
 * reflects the current tick count. Both actions POST the current list query plus,
 * when rows are ticked, the ticked ids, differing only by `format`.
 */
export function ListExportButton({
  endpoint,
  query,
  columns,
  filename,
  selectedIds,
  onReauthRequired,
}: ListExportButtonProps) {
  const allKeys = useMemo(() => columns.map((column) => column.key), [columns])
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => new Set(allKeys))
  const [cap, setCap] = useState<ExportRowCap>("all")
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" })

  const useIds = selectedIds.length > 0
  const checkedCount = checkedKeys.size
  const isLoading = status.kind === "loading"
  const canExport = checkedCount > 0 && !isLoading

  const toggleColumn = (key: string) => {
    setCheckedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const setAllColumns = (checked: boolean) => {
    setCheckedKeys(checked ? new Set(allKeys) : new Set())
  }

  const runExport = async (format: ExportFormat) => {
    setStatus({ kind: "loading", format })
    try {
      const orderedKeys = allKeys.filter((key) => checkedKeys.has(key))
      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          query,
          ...(useIds ? { ids: [...selectedIds] } : {}),
          columns: orderedKeys,
          cap,
          format,
        }),
      })

      if (!response.ok) {
        let message = `Export failed (${response.status})`
        let code: string | undefined
        try {
          const data = (await response.json()) as { error?: string; code?: string }
          if (data?.error) message = data.error
          code = data?.code
        } catch {
          // non-JSON error body — keep the status-code message
        }
        if (code === GOOGLE_REAUTH_CODE) {
          setStatus({ kind: "reauth", message })
        } else {
          setStatus({ kind: "error", message })
        }
        return
      }

      if (format === "sheet") {
        const data = (await response.json()) as { url?: string; total?: number; count?: number }
        // Best-effort auto-open. It fires after the await, so the browser no longer
        // sees it as tied to the click and may block it — and `noopener` makes the
        // return value `null` even on success, so we can't tell. The success state
        // always renders the link below as the reliable, gesture-safe way in.
        if (data.url) window.open(data.url, "_blank", "noopener")
        const total = data.total ?? 0
        const count = data.count ?? 0
        const scope =
          total > count
            ? `first ${count.toLocaleString()} of ${total.toLocaleString()} rows`
            : `${count.toLocaleString()} ${count === 1 ? "row" : "rows"}`
        setStatus({ kind: "done", message: `Exported ${scope} to Google Sheets`, url: data.url })
        return
      }

      // CSV: stream the blob back and download via a synthetic anchor click.
      const total = Number(response.headers.get("x-export-total") ?? "0")
      const count = Number(response.headers.get("x-export-count") ?? "0")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = filename
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      setStatus({
        kind: "done",
        message:
          total > count
            ? `Exported first ${count.toLocaleString()} of ${total.toLocaleString()} rows`
            : `Exported ${count.toLocaleString()} ${count === 1 ? "row" : "rows"}`,
      })
    } catch (error) {
      setStatus({
        kind: "error",
        message: error instanceof Error ? error.message : "Export failed",
      })
    }
  }

  return (
    <ToolbarMenuButton
      label="Export"
      icon={Download}
      active={useIds}
      title="Export"
      bodyClassName="w-[24rem]"
      maxHeight={560}
    >
      {/* Scope note — reflects the table's tick count. Selection happens on the
          table (always-visible checkboxes), not in this menu. */}
      <p className="text-xs text-[var(--foreground)]/60">
        {useIds
          ? `Exporting ${selectedIds.length.toLocaleString()} selected ${
              selectedIds.length === 1 ? "row" : "rows"
            }`
          : "Exporting all rows matching the current filters"}
      </p>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--foreground)]/70">
          Columns
        </span>
        <div className="flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setAllColumns(true)}
            className="text-sky-600 hover:underline"
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setAllColumns(false)}
            className="text-[var(--foreground)]/60 hover:underline"
          >
            None
          </button>
        </div>
      </div>

      <div className="flex max-h-56 flex-col gap-1 overflow-y-auto pr-1">
        {columns.map((column) => (
          <label
            key={column.key}
            className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]/80"
          >
            <input
              type="checkbox"
              className={CHECKBOX_CLASS}
              checked={checkedKeys.has(column.key)}
              onChange={() => toggleColumn(column.key)}
            />
            {column.label}
          </label>
        ))}
      </div>

      <label className="flex items-center justify-between gap-2 text-sm text-[var(--foreground)]/80">
        Rows
        <select
          value={String(cap)}
          onChange={(event) =>
            setCap(event.target.value === "all" ? "all" : (Number(event.target.value) as ExportRowCap))
          }
          className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] px-2 py-1 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/40"
        >
          {EXPORT_ROW_CAP_OPTIONS.map((option) => (
            <option key={String(option)} value={String(option)}>
              {capLabel(option)}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => runExport("sheet")}
          disabled={!canExport}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Sheet size={14} strokeWidth={2.5} aria-hidden="true" />
          {status.kind === "loading" && status.format === "sheet" ? "Opening…" : "Open in Google Sheets"}
        </button>
        <button
          type="button"
          onClick={() => runExport("csv")}
          disabled={!canExport}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-[var(--panel-border)] px-3 py-1.5 text-sm font-semibold text-[var(--foreground)]/80 transition hover:bg-[var(--panel-border)]/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={14} strokeWidth={2.5} aria-hidden="true" />
          {status.kind === "loading" && status.format === "csv" ? "Exporting…" : "Download CSV"}
        </button>
      </div>

      {status.kind === "error" ? (
        <p className="text-xs text-rose-500">{status.message}</p>
      ) : status.kind === "reauth" ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-amber-600">{status.message}</p>
          {onReauthRequired ? (
            <button
              type="button"
              onClick={onReauthRequired}
              className="self-start text-xs font-semibold text-sky-600 hover:underline"
            >
              Connect Google Drive
            </button>
          ) : null}
        </div>
      ) : status.kind === "done" ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-xs text-emerald-600">{status.message}</p>
          {status.url ? (
            <a
              href={status.url}
              target="_blank"
              rel="noopener noreferrer"
              className="self-start text-xs font-semibold text-sky-600 hover:underline"
            >
              Open in Google Sheets ↗
            </a>
          ) : null}
        </div>
      ) : null}
    </ToolbarMenuButton>
  )
}
