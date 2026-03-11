"use client"

import { useState } from "react"

type CutLogRow = {
  id: string
  inventoryId: string
  createdAt: string
  productName: string
  itemNumber: string
  locationLabel: string
  before: string
  cut: string
  after: string
  notes: string
}

export default function CutLogsClient({ initialLogs }: { initialLogs: CutLogRow[] }) {
  const [logs, setLogs] = useState(initialLogs)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function deleteLog(id: string) {
    setMessage("")
    setError("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/flooring/cut-logs/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        updatedRows?: Array<{ id: string; before: string; after: string }>
      }
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete cut")

      const updatedMap = new Map((payload.updatedRows ?? []).map((row) => [row.id, row]))
      setLogs((prev) =>
        prev
          .filter((log) => log.id !== id)
          .map((log) => (updatedMap.has(log.id) ? { ...log, ...updatedMap.get(log.id)! } : log)),
      )
      setMessage("Cut deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete cut")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
      <h1 className="text-2xl font-bold text-blue-500">Cut Logs</h1>
      <p className="mt-2 text-sm text-[var(--foreground)]/70">Inventory adjustments. Positive values reduce stock and negative values add stock back.</p>

      {message ? <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

      <div className="mt-6 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
        <table className="w-full min-w-[1180px] text-sm">
          <thead className="bg-[var(--panel-hover)] text-left">
            <tr>
              <th className="h-10 px-3 py-2">Created</th>
              <th className="h-10 px-3 py-2">Product</th>
              <th className="h-10 px-3 py-2">Item #</th>
              <th className="h-10 px-3 py-2">Location</th>
              <th className="h-10 px-3 py-2">Before</th>
              <th className="h-10 px-3 py-2">Cut</th>
              <th className="h-10 px-3 py-2">After</th>
              <th className="h-10 px-3 py-2">Notes</th>
              <th className="h-10 px-3 py-2">Delete</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-[var(--panel-border)]">
                <td className="px-3 py-2">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="px-3 py-2">{log.productName}</td>
                <td className="px-3 py-2">{log.itemNumber}</td>
                <td className="px-3 py-2">{log.locationLabel}</td>
                <td className="px-3 py-2">{log.before}</td>
                <td className="px-3 py-2">{log.cut}</td>
                <td className="px-3 py-2">{log.after}</td>
                <td className="px-3 py-2">{log.notes || "-"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => void deleteLog(log.id)}
                    disabled={deletingId === log.id}
                    className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
                  >
                    {deletingId === log.id ? "Deleting..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
            {logs.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                  No cut logs yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
