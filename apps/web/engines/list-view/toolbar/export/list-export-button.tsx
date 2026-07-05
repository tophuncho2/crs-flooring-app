"use client"

import { useMemo, useState } from "react"
import { Download } from "lucide-react"
import { EXPORT_ROW_CAP_OPTIONS, type ExportRowCap } from "@builders/domain"
import { ToolbarMenuButton } from "../action-bar/toolbar-menu-button"
import { DataTableSelectAllButton } from "../../table/select"

const CHECKBOX_CLASS =
  "h-4 w-4 cursor-pointer rounded border-[var(--panel-border)] text-sky-600 focus:ring-1 focus:ring-sky-500/40"

type ExportStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "done"; message: string }
  | { kind: "error"; message: string }

export type ListExportColumn = { key: string; label: string }

export type ListExportButtonProps = {
  /** Export endpoint, e.g. `/api/inventory/export`. */
  endpoint: string
  /** Current list query string (filters + sort), without leading `?`. */
  query: string
  /** Exportable columns ({ key, label }) — all checked by default. */
  columns: ReadonlyArray<ListExportColumn>
  /** Download filename, e.g. `inventory-export.csv`. */
  filename: string
  /** Whether row-selection mode is on (checkboxes visible on the table). */
  selectionEnabled: boolean
  /** Turn row-selection mode on/off. */
  onToggleSelectionEnabled: () => void
  /** Ticked row ids — only meaningful while selection mode is on. */
  selectedIds: ReadonlyArray<string>
  /** Eligible rows on the current page (drives the Select-all control). */
  eligibleCount: number
  /** Select-all / clear for the current page. */
  onToggleAll: () => void
}

function capLabel(cap: ExportRowCap): string {
  return cap === "all" ? "All" : cap.toLocaleString()
}

/**
 * The right-cluster "Export" tool: a {@link ToolbarMenuButton} whose popover
 * hosts a "Select specific rows" toggle (reveals the table's checkbox column +
 * the relocated Select-all control), the column-picker checkboxes, a row-cap
 * dropdown, and a Download button. Always POSTs to the consumer's export
 * endpoint with the current list query plus — when selection mode is on and
 * rows are ticked — the ticked ids, then streams the CSV back via `fetch → blob`
 * so the button can show a loading state and surface errors / truncation inline.
 */
export function ListExportButton({
  endpoint,
  query,
  columns,
  filename,
  selectionEnabled,
  onToggleSelectionEnabled,
  selectedIds,
  eligibleCount,
  onToggleAll,
}: ListExportButtonProps) {
  const allKeys = useMemo(() => columns.map((column) => column.key), [columns])
  const [checkedKeys, setCheckedKeys] = useState<Set<string>>(() => new Set(allKeys))
  const [cap, setCap] = useState<ExportRowCap>("all")
  const [status, setStatus] = useState<ExportStatus>({ kind: "idle" })

  const useIds = selectionEnabled && selectedIds.length > 0
  const checkedCount = checkedKeys.size
  const isLoading = status.kind === "loading"
  const canDownload = checkedCount > 0 && !isLoading

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

  const download = async () => {
    setStatus({ kind: "loading" })
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
        }),
      })

      if (!response.ok) {
        let message = `Export failed (${response.status})`
        try {
          const data = (await response.json()) as { error?: string }
          if (data?.error) message = data.error
        } catch {
          // non-JSON error body — keep the status-code message
        }
        setStatus({ kind: "error", message })
        return
      }

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
      active={selectionEnabled}
      title="Export CSV"
      bodyClassName="w-[24rem]"
    >
      {/* Selection-mode toggle — reveals the table's checkbox column. When off,
          the export covers the whole filtered set. */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--foreground)]/80">
        <input
          type="checkbox"
          className={CHECKBOX_CLASS}
          checked={selectionEnabled}
          onChange={onToggleSelectionEnabled}
        />
        Select specific rows
      </label>

      {selectionEnabled ? (
        <div className="flex flex-col gap-1.5">
          <DataTableSelectAllButton
            isSelectionActive={selectedIds.length > 0}
            selectedCount={selectedIds.length}
            eligibleCount={eligibleCount}
            canSelect
            onToggle={onToggleAll}
          />
          <p className="text-xs text-[var(--foreground)]/60">
            {selectedIds.length > 0
              ? `Exporting ${selectedIds.length.toLocaleString()} selected ${
                  selectedIds.length === 1 ? "row" : "rows"
                }`
              : "No rows ticked — exporting all matching"}
          </p>
        </div>
      ) : (
        <p className="text-xs text-[var(--foreground)]/60">
          Exporting all rows matching the current filters
        </p>
      )}

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

      <div className="flex max-h-72 flex-col gap-1 overflow-y-auto pr-1">
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

      <button
        type="button"
        onClick={download}
        disabled={!canDownload}
        className="inline-flex items-center justify-center gap-1.5 rounded-md bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={14} strokeWidth={2.5} aria-hidden="true" />
        {isLoading ? "Exporting…" : "Download CSV"}
      </button>

      {status.kind === "error" ? (
        <p className="text-xs text-rose-500">{status.message}</p>
      ) : status.kind === "done" ? (
        <p className="text-xs text-emerald-600">{status.message}</p>
      ) : null}
    </ToolbarMenuButton>
  )
}
