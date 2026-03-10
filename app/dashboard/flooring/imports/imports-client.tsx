"use client"

import { useState } from "react"

type ImportRow = {
  id: string
  importName: string
  importType: string
  status: string
  source: string
  notes: string
  createdAt: string
  updatedAt: string
}

type DraftImport = {
  importName: string
  importType: string
  status: string
  source: string
  notes: string
}

const defaultDraft: DraftImport = {
  importName: "",
  importType: "",
  status: "",
  source: "",
  notes: "",
}

export default function ImportsClient({ initialImports }: { initialImports: ImportRow[] }) {
  const [rows, setRows] = useState(initialImports)
  const [drafts, setDrafts] = useState<Record<string, DraftImport>>({})
  const [newDraft, setNewDraft] = useState<DraftImport>(defaultDraft)
  const [showNewRow, setShowNewRow] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function getDraft(row: ImportRow): DraftImport {
    return drafts[row.id] ?? {
      importName: row.importName,
      importType: row.importType,
      status: row.status,
      source: row.source,
      notes: row.notes,
    }
  }

  function setDraftField(id: string, field: keyof DraftImport, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(rows.find((row) => row.id === id)!), [field]: value } }))
  }

  async function createImport() {
    setIsSavingNew(true)
    setError("")
    setMessage("")
    try {
      const response = await fetch("/api/flooring/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })
      const payload = (await response.json().catch(() => ({}))) as { import?: ImportRow; error?: string }
      if (!response.ok || !payload.import) throw new Error(payload.error ?? "Failed to create import")
      setRows((prev) => [payload.import!, ...prev])
      setNewDraft(defaultDraft)
      setShowNewRow(false)
      setMessage("Import created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create import")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveImport(row: ImportRow) {
    setSavingId(row.id)
    setError("")
    setMessage("")
    try {
      const response = await fetch(`/api/flooring/imports/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getDraft(row)),
      })
      const payload = (await response.json().catch(() => ({}))) as { import?: ImportRow; error?: string }
      if (!response.ok || !payload.import) throw new Error(payload.error ?? "Failed to save import")
      setRows((prev) => prev.map((item) => (item.id === row.id ? payload.import! : item)))
      setMessage("Import saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save import")
    } finally {
      setSavingId(null)
    }
  }

  async function deleteImport(id: string) {
    setDeletingId(id)
    setError("")
    setMessage("")
    try {
      const response = await fetch(`/api/flooring/imports/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) throw new Error(payload.error ?? "Failed to delete import")
      setRows((prev) => prev.filter((row) => row.id !== id))
      setMessage("Import deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete import")
    } finally {
      setDeletingId(null)
    }
  }

  function renderRow(draft: DraftImport, onChange: (field: keyof DraftImport, value: string) => void, onSave: () => void, saving: boolean, onDelete?: () => void, deleting = false) {
    return (
      <>
        <td className="px-3 py-2"><input value={draft.importName} onChange={(event) => onChange("importName", event.target.value)} className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2"><input value={draft.importType} onChange={(event) => onChange("importType", event.target.value)} className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2"><input value={draft.status} onChange={(event) => onChange("status", event.target.value)} className="w-32 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2"><input value={draft.source} onChange={(event) => onChange("source", event.target.value)} className="w-48 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2"><input value={draft.notes} onChange={(event) => onChange("notes", event.target.value)} className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
        <td className="px-3 py-2"><button type="button" onClick={onSave} disabled={saving} className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60">{saving ? "Saving..." : "Save"}</button></td>
        <td className="px-3 py-2">{onDelete ? <button type="button" onClick={onDelete} disabled={deleting} className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 hover:bg-rose-500/10 disabled:opacity-60">{deleting ? "Deleting..." : "Delete"}</button> : <span className="text-[var(--foreground)]/50">-</span>}</td>
      </>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-blue-500">Imports</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/70">Track flooring imports and their current status.</p>
        {message ? <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
          <table className="min-w-full text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="px-3 py-2">Import</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Notes</th>
                <th className="px-3 py-2">Save</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {showNewRow ? <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">{renderRow(newDraft, (field, value) => setNewDraft((prev) => ({ ...prev, [field]: value })), () => void createImport(), isSavingNew)}</tr> : null}
              {rows.map((row) => {
                const draft = getDraft(row)
                return <tr key={row.id} className="border-t border-[var(--panel-border)]">{renderRow(draft, (field, value) => setDraftField(row.id, field, value), () => void saveImport(row), savingId === row.id, () => void deleteImport(row.id), deletingId === row.id)}</tr>
              })}
              {rows.length === 0 && !showNewRow ? <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--foreground)]/70">No imports logged yet.</td></tr> : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3">
          <button type="button" onClick={() => setShowNewRow((prev) => !prev)} className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]">
            {showNewRow ? "Cancel" : "Add Import"}
          </button>
        </div>
      </section>
    </div>
  )
}
