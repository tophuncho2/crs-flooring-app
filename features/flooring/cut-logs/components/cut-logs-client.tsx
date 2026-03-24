"use client"

import { useState } from "react"
import { formatStableDateTime } from "@/features/flooring/shared/domain/date-format"
import { getClientErrorMessage } from "@/features/flooring/shared/transport/client-errors"
import { requestJson } from "@/features/flooring/shared/transport/http"
import { DashboardCardHeader } from "@/features/flooring/shared/ui/display/dashboard-card-title"
import { ErrorNotice, SuccessNotice } from "@/features/flooring/shared/ui/feedback/notices"
import { DeleteRowButton } from "@/features/flooring/shared/ui/table/row-action-buttons"
import { TableEmptyRow, TableHead, TableHeaderCell, TableShell } from "@/features/flooring/shared/ui/table/table-shell"

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
      const payload = await requestJson<{
        updatedRows?: Array<{ id: string; before: string; after: string }>
      }>(`/api/flooring/cut-logs/${id}`, { method: "DELETE" })

      const updatedMap = new Map((payload.updatedRows ?? []).map((row) => [row.id, row]))
      setLogs((prev) =>
        prev
          .filter((log) => log.id !== id)
          .map((log) => (updatedMap.has(log.id) ? { ...log, ...updatedMap.get(log.id)! } : log)),
      )
      setMessage("Cut deleted")
    } catch (deleteError) {
      setError(getClientErrorMessage(deleteError, "Failed to delete cut"))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
      <DashboardCardHeader title="Cut Logs" />

      {message ? <SuccessNotice className="mt-3">{message}</SuccessNotice> : null}
      {error ? <ErrorNotice className="mt-3">{error}</ErrorNotice> : null}

      <TableShell minWidthClass="min-w-[1180px]" className="mt-6">
        <TableHead>
          <tr>
            <TableHeaderCell>Created</TableHeaderCell>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell>Item #</TableHeaderCell>
            <TableHeaderCell>Location</TableHeaderCell>
            <TableHeaderCell>Before</TableHeaderCell>
            <TableHeaderCell>Cut</TableHeaderCell>
            <TableHeaderCell>After</TableHeaderCell>
            <TableHeaderCell>Notes</TableHeaderCell>
            <TableHeaderCell>Delete</TableHeaderCell>
          </tr>
        </TableHead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-t border-[var(--panel-border)]">
              <td className="px-3 py-2">{formatStableDateTime(log.createdAt)}</td>
              <td className="px-3 py-2">{log.productName}</td>
              <td className="px-3 py-2">{log.itemNumber}</td>
              <td className="px-3 py-2">{log.locationLabel}</td>
              <td className="px-3 py-2">{log.before}</td>
              <td className="px-3 py-2">{log.cut}</td>
              <td className="px-3 py-2">{log.after}</td>
              <td className="px-3 py-2">{log.notes || "-"}</td>
              <td className="px-3 py-2">
                <DeleteRowButton onClick={() => void deleteLog(log.id)} disabled={deletingId === log.id}>
                  {deletingId === log.id ? "Deleting..." : "Delete"}
                </DeleteRowButton>
              </td>
            </tr>
          ))}
          {logs.length === 0 ? <TableEmptyRow message="No cut logs yet." colSpan={9} /> : null}
        </tbody>
      </TableShell>
    </section>
  )
}
