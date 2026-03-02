"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

type JobRow = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string
  createdAt: string
}

type ApiJob = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string | number
  createdAt?: string
}

type DraftJob = {
  id?: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string
}

const defaultDraft: DraftJob = {
  name: "",
  address: "",
  propertyName: "",
  contactName: "",
  contactNumber: "",
  budget: "",
}

export default function JobsClient({ initialJobs }: { initialJobs: JobRow[] }) {
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs)
  const [drafts, setDrafts] = useState<Record<string, DraftJob>>({})
  const [newDraft, setNewDraft] = useState<DraftJob>(defaultDraft)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function getDraft(job: JobRow): DraftJob {
    return drafts[job.id] ?? {
      id: job.id,
      name: job.name,
      address: job.address,
      propertyName: job.propertyName,
      contactName: job.contactName,
      contactNumber: job.contactNumber,
      budget: job.budget,
    }
  }

  function updateDraft(id: string, field: keyof DraftJob, value: string) {
    setDrafts((prev) => {
      const current = jobs.find((job) => job.id === id)
      const fallback: DraftJob = current
        ? {
            id,
            name: current.name,
            address: current.address,
            propertyName: current.propertyName,
            contactName: current.contactName,
            contactNumber: current.contactNumber,
            budget: current.budget,
          }
        : defaultDraft

      return {
        ...prev,
        [id]: {
          ...(prev[id] ?? fallback),
          [field]: value,
        },
      }
    })
  }

  async function saveJob(job: JobRow) {
    setSavingId(job.id)
    setError("")
    setMessage("")

    try {
      const draft = getDraft(job)

      const response = await fetch(`/api/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; job?: ApiJob }
      if (!response.ok || !payload.job) {
        throw new Error(payload.error ?? "Failed to save job")
      }

      const updatedJob = payload.job

      setJobs((prev) =>
        prev.map((row) =>
          row.id === job.id
            ? {
                id: updatedJob.id,
                name: updatedJob.name,
                address: updatedJob.address,
                propertyName: updatedJob.propertyName,
                contactName: updatedJob.contactName,
                contactNumber: updatedJob.contactNumber,
                budget: String(updatedJob.budget),
                createdAt: row.createdAt,
              }
            : row,
        ),
      )
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[job.id]
        return next
      })
      setMessage("Job saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save job")
    } finally {
      setSavingId(null)
    }
  }

  async function createJob() {
    setIsSavingNew(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as { error?: string; job?: ApiJob }
      if (!response.ok || !payload.job) {
        throw new Error(payload.error ?? "Failed to create job")
      }

      const createdJob = payload.job

      setJobs((prev) => [
        {
          id: createdJob.id,
          name: createdJob.name,
          address: createdJob.address,
          propertyName: createdJob.propertyName,
          contactName: createdJob.contactName,
          contactNumber: createdJob.contactNumber,
          budget: String(createdJob.budget),
          createdAt: createdJob.createdAt ?? new Date().toISOString(),
        },
        ...prev,
      ])
      setNewDraft(defaultDraft)
      setMessage("Job created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create job")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function deleteJob(jobId: string) {
    setError("")
    setMessage("")

    try {
      const response = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete job")
      }

      setJobs((prev) => prev.filter((job) => job.id !== jobId))
      setMessage("Job deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete job")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-12 pt-20 text-[var(--foreground)] sm:px-6 sm:pt-24 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-blue-500">Jobs</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">Create and manage jobs used by Daily Scope.</p>

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

          <div className="mt-4 overflow-auto rounded-lg border border-[var(--panel-border)]">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Job Name</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Property Name</th>
                  <th className="px-3 py-2">Contact Name</th>
                  <th className="px-3 py-2">Contact Number</th>
                  <th className="px-3 py-2">Budget</th>
                  <th className="px-3 py-2">Save</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                  <td className="px-3 py-2">
                    <input value={newDraft.name} onChange={(event) => setNewDraft((prev) => ({ ...prev, name: event.target.value }))} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={newDraft.address} onChange={(event) => setNewDraft((prev) => ({ ...prev, address: event.target.value }))} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={newDraft.propertyName} onChange={(event) => setNewDraft((prev) => ({ ...prev, propertyName: event.target.value }))} className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={newDraft.contactName} onChange={(event) => setNewDraft((prev) => ({ ...prev, contactName: event.target.value }))} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <input value={newDraft.contactNumber} onChange={(event) => setNewDraft((prev) => ({ ...prev, contactNumber: event.target.value }))} className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <input type="number" step="0.01" value={newDraft.budget} onChange={(event) => setNewDraft((prev) => ({ ...prev, budget: event.target.value }))} className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void createJob()}
                      disabled={isSavingNew}
                      className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      <Plus size={13} /> {isSavingNew ? "Saving..." : "Add"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]/60">-</td>
                </tr>

                {jobs.map((job) => {
                  const draft = getDraft(job)
                  const isSaving = savingId === job.id

                  return (
                    <tr key={job.id} className="border-t border-[var(--panel-border)]">
                      <td className="px-3 py-2">
                        <input value={draft.name} onChange={(event) => updateDraft(job.id, "name", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={draft.address} onChange={(event) => updateDraft(job.id, "address", event.target.value)} className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={draft.propertyName} onChange={(event) => updateDraft(job.id, "propertyName", event.target.value)} className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={draft.contactName} onChange={(event) => updateDraft(job.id, "contactName", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">
                        <input value={draft.contactNumber} onChange={(event) => updateDraft(job.id, "contactNumber", event.target.value)} className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" step="0.01" value={draft.budget} onChange={(event) => updateDraft(job.id, "budget", event.target.value)} className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void saveJob(job)}
                          disabled={isSaving}
                          className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void deleteJob(job.id)}
                          className="rounded p-2 text-rose-600 transition hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No jobs yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
