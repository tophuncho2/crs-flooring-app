"use client"

import type { ReactNode } from "react"
import { useMemo, useState } from "react"
import { Plus, Trash2, X } from "lucide-react"

type JobOption = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
}

type ScopeRow = {
  room: string
  description: string
}

type SavedDailyScopeItem = {
  room: string
  description: string
}

type SavedDailyScope = {
  id: string
  jobId: string
  jobName: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  createdAt: string
  customerFileName: string | null
  customerFileAt: string | null
  items: SavedDailyScopeItem[]
}

const defaultRow: ScopeRow = {
  room: "General",
  description: "",
}

function normalizeRoom(room: string): string {
  return room.trim() === "" ? "Unassigned" : room.trim()
}

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-6xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-5 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            type="button"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function DailyScopeClient({ jobs }: { jobs: JobOption[] }) {
  const [selectedJobId, setSelectedJobId] = useState("")
  const [rows, setRows] = useState<ScopeRow[]>([defaultRow])
  const [activeDailyScopeId, setActiveDailyScopeId] = useState<string | null>(null)
  const [savedScopes, setSavedScopes] = useState<SavedDailyScope[]>([])
  const [isSavedModalOpen, setIsSavedModalOpen] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDownloadingFile, setIsDownloadingFile] = useState(false)
  const [showAddRoomForm, setShowAddRoomForm] = useState(false)
  const [newRoomName, setNewRoomName] = useState("")
  const [activeFileName, setActiveFileName] = useState<string | null>(null)

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId])

  const groupedRows = useMemo(() => {
    const groups = new Map<string, Array<{ row: ScopeRow; index: number }>>()
    rows.forEach((row, index) => {
      const roomName = normalizeRoom(row.room)
      if (!groups.has(roomName)) {
        groups.set(roomName, [])
      }
      groups.get(roomName)?.push({ row, index })
    })
    return Array.from(groups.entries())
  }, [rows])

  function updateRow(index: number, next: Partial<ScopeRow>) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...next } : row)))
  }

  function addRow(room?: string) {
    setRows((prev) => [
      ...prev,
      {
        ...defaultRow,
        room: room ?? "General",
      },
    ])
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index))
  }

  function submitAddRoomForm(event: React.FormEvent) {
    event.preventDefault()
    const roomName = newRoomName.trim()
    if (!roomName) return

    addRow(roomName)
    setNewRoomName("")
    setShowAddRoomForm(false)
  }

  async function loadSavedScopes() {
    setError("")

    try {
      const response = await fetch("/api/daily-scopes", { cache: "no-store" })
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        dailyScopes?: Array<{
          id: string
          jobId: string
          jobName: string
          address: string
          propertyName: string
          contactName: string
          contactNumber: string
          createdAt: string
          customerFileName: string | null
          customerFileAt: string | null
          items: Array<{
            room: string
            description: string
          }>
        }>
      }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load saved daily scopes")
      }

      const mapped: SavedDailyScope[] = (payload.dailyScopes ?? []).map((scope) => ({
        id: scope.id,
        jobId: scope.jobId,
        jobName: scope.jobName,
        address: scope.address,
        propertyName: scope.propertyName,
        contactName: scope.contactName,
        contactNumber: scope.contactNumber,
        createdAt: scope.createdAt,
        customerFileName: scope.customerFileName,
        customerFileAt: scope.customerFileAt,
        items: scope.items.map((item) => ({
          room: item.room,
          description: item.description,
        })),
      }))

      setSavedScopes(mapped)
      setIsSavedModalOpen(true)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load saved daily scopes")
    }
  }

  function openSavedScope(scope: SavedDailyScope) {
    setSelectedJobId(scope.jobId)
    setRows(
      scope.items.length > 0
        ? scope.items.map((item) => ({
            room: item.room,
            description: item.description,
          }))
        : [defaultRow],
    )
    setActiveDailyScopeId(scope.id)
    setActiveFileName(scope.customerFileName)
    setIsSavedModalOpen(false)
    setMessage("Saved daily scope loaded")
    setError("")
  }

  async function downloadScopeFile(scopeId: string, fileName?: string | null) {
    setIsDownloadingFile(true)
    setError("")

    try {
      const response = await fetch(`/api/daily-scopes/${scopeId}/customer-file`, {
        method: "GET",
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(payload.error ?? "Failed to download daily scope file")
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = fileName ?? `daily-scope-${scopeId}-invoice.pdf`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Failed to download daily scope file")
    } finally {
      setIsDownloadingFile(false)
    }
  }

  async function saveScope() {
    setIsSaving(true)
    setError("")
    setMessage("")

    try {
      if (!selectedJobId) {
        throw new Error("Select a job first")
      }

      const body = {
        jobId: selectedJobId,
        rows,
      }
      const endpoint = activeDailyScopeId ? `/api/daily-scopes/${activeDailyScopeId}` : "/api/daily-scopes"
      const method = activeDailyScopeId ? "PATCH" : "POST"

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        dailyScope?: { id: string; customerFileName?: string | null }
      }

      if (!response.ok || !payload.dailyScope) {
        throw new Error(payload.error ?? "Failed to save daily scope")
      }

      setActiveDailyScopeId(payload.dailyScope.id)
      setActiveFileName(payload.dailyScope.customerFileName ?? null)
      setMessage(activeDailyScopeId ? "Daily scope updated" : "Daily scope saved")
      await downloadScopeFile(payload.dailyScope.id, payload.dailyScope.customerFileName)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save daily scope")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-28 pt-20 text-[var(--foreground)] sm:px-6 sm:pt-24 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold text-blue-500">Daily Scope</h1>
              <p className="mt-1 text-sm text-[var(--foreground)]/70">Build room-based daily scope invoices and save PDFs.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {activeDailyScopeId && activeFileName && (
                <button
                  type="button"
                  onClick={() => void downloadScopeFile(activeDailyScopeId, activeFileName)}
                  className="rounded-lg border border-blue-500/40 px-3 py-2 text-sm text-blue-500 transition hover:bg-blue-500/10 disabled:opacity-60"
                  disabled={isDownloadingFile}
                >
                  {isDownloadingFile ? "Downloading..." : "Download Daily Scope File"}
                </button>
              )}
              <button
                type="button"
                onClick={() => void loadSavedScopes()}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
              >
                Saved Daily Scopes
              </button>
            </div>
          </div>

          {message && (
            <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
              {message}
            </p>
          )}
          {error && (
            <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Job">
              <select
                value={selectedJobId}
                onChange={(event) => setSelectedJobId(event.target.value)}
                className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
              >
                <option value="">Select Job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Address">
              <input
                value={selectedJob?.address ?? ""}
                readOnly
                className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 px-3 py-3 text-base"
              />
            </Field>
            <Field label="Property Name">
              <input
                value={selectedJob?.propertyName ?? ""}
                readOnly
                className="w-full rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)]/40 px-3 py-3 text-base"
              />
            </Field>
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Daily Scope Line Items</h2>
            <button
              type="button"
              onClick={() => setShowAddRoomForm(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
            >
              <Plus size={14} /> Add Room
            </button>
          </div>

          {showAddRoomForm && (
            <form onSubmit={submitAddRoomForm} className="rounded-lg border border-[var(--panel-border)] p-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={newRoomName}
                  onChange={(event) => setNewRoomName(event.target.value)}
                  placeholder="Room name"
                  className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2 text-base"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black transition hover:bg-blue-400"
                  >
                    <Plus size={14} /> Save Room
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddRoomForm(false)
                      setNewRoomName("")
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
                  >
                    <X size={14} /> Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="hidden md:block">
            {groupedRows.map(([roomName, roomRows]) => (
              <div key={roomName} className="mb-5 overflow-hidden rounded-lg border border-[var(--panel-border)]">
                <div className="bg-[var(--panel-hover)] px-3 py-2 text-sm font-semibold">Room: {roomName}</div>
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--panel-hover)]/60 text-left">
                    <tr>
                      <th className="px-3 py-2">Room</th>
                      <th className="px-3 py-2">Line Item</th>
                      <th className="px-3 py-2">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roomRows.map(({ row, index }) => (
                      <tr key={`${roomName}-${index}`} className="border-t border-[var(--panel-border)]">
                        <td className="px-3 py-2">
                          <input
                            value={row.room}
                            onChange={(event) => updateRow(index, { room: event.target.value })}
                            className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            value={row.description}
                            onChange={(event) => updateRow(index, { description: event.target.value })}
                            className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-2"
                            placeholder="Scope line item"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(index)}
                            className="rounded-md p-2 text-rose-600 transition hover:bg-rose-500/10"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-start border-t border-[var(--panel-border)] p-2">
                  <button
                    type="button"
                    onClick={() => addRow(roomName)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 md:hidden">
            {groupedRows.map(([roomName, roomRows]) => (
              <div key={roomName} className="space-y-3">
                <h3 className="text-sm font-semibold text-blue-500">Room: {roomName}</h3>
                {roomRows.map(({ row, index }) => (
                  <div key={`${roomName}-${index}`} className="space-y-3 rounded-lg border border-[var(--panel-border)] p-3">
                    <Field label="Room">
                      <input
                        value={row.room}
                        onChange={(event) => updateRow(index, { room: event.target.value })}
                        className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
                      />
                    </Field>
                    <Field label="Line Item">
                      <input
                        value={row.description}
                        onChange={(event) => updateRow(index, { description: event.target.value })}
                        className="w-full rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-3 text-base"
                      />
                    </Field>
                    <button
                      type="button"
                      onClick={() => removeRow(index)}
                      className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-600"
                    >
                      <Trash2 size={14} /> Remove Row
                    </button>
                  </div>
                ))}
                <div className="flex justify-start">
                  <button
                    type="button"
                    onClick={() => addRow(roomName)}
                    className="inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm transition hover:bg-[var(--panel-hover)]"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {isSavedModalOpen && (
        <ModalShell title="Saved Daily Scopes" onClose={() => setIsSavedModalOpen(false)}>
          <div className="max-h-[65vh] overflow-auto rounded-lg border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Job</th>
                  <th className="px-3 py-2">Property</th>
                  <th className="px-3 py-2">Rows</th>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {savedScopes.map((scope) => (
                  <tr
                    key={scope.id}
                    onClick={() => openSavedScope(scope)}
                    className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]"
                  >
                    <td className="px-3 py-2">{scope.jobName || "Untitled Job"}</td>
                    <td className="px-3 py-2">{scope.propertyName || "-"}</td>
                    <td className="px-3 py-2">{scope.items.length}</td>
                    <td className="px-3 py-2">
                      {scope.customerFileName ? (
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            void downloadScopeFile(scope.id, scope.customerFileName)
                          }}
                          className="rounded-md border border-blue-500/40 px-2 py-1 text-xs text-blue-500 hover:bg-blue-500/10"
                        >
                          Download
                        </button>
                      ) : (
                        <span className="text-[var(--foreground)]/60">No file</span>
                      )}
                    </td>
                    <td className="px-3 py-2">{new Date(scope.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {savedScopes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No saved daily scopes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </ModalShell>
      )}

      <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--panel-border)] bg-[var(--panel-background)] p-3">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            className="w-full rounded-lg bg-blue-500 px-4 py-3 text-base font-semibold text-black transition hover:bg-blue-400"
            onClick={() => void saveScope()}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : activeDailyScopeId ? "Update and Generate Invoice" : "Save and Generate Invoice"}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}
