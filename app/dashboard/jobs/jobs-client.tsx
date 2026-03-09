"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ExternalLink, Plus, Trash2 } from "lucide-react"

type UserOption = {
  id: string
  email: string
}

type JobRow = {
  id: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string
  assignedUserIds: string[]
  pendingExpenses: string
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
  assignees?: Array<{ user: { id: string; email: string } }>
}

type DraftJob = {
  id?: string
  name: string
  address: string
  propertyName: string
  contactName: string
  contactNumber: string
  budget: string
  assignedUserIds: string[]
}

type ModuleButton = {
  slug: string
  name: string
  path: string
  isUnlocked: boolean
}

const defaultDraft: DraftJob = {
  name: "",
  address: "",
  propertyName: "",
  contactName: "",
  contactNumber: "",
  budget: "",
  assignedUserIds: [],
}

function UserMultiSelect({
  users,
  value,
  onChange,
  placeholder = "Select users",
}: {
  users: UserOption[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
}) {
  const selectedLabels = value
    .map((id) => users.find((user) => user.id === id)?.email)
    .filter((email): email is string => Boolean(email))

  function toggleUser(userId: string) {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId))
      return
    }
    onChange([...value, userId])
  }

  return (
    <details className="relative w-56">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded border border-[var(--panel-border)] bg-transparent px-2 py-1 text-sm">
        <span className="truncate text-left text-[var(--foreground)]/90">
          {selectedLabels.length > 0 ? selectedLabels.join(", ") : placeholder}
        </span>
        <ChevronDown size={14} className="shrink-0 text-[var(--foreground)]/70" />
      </summary>
      <div className="absolute z-10 mt-1 max-h-52 w-full overflow-auto rounded border border-[var(--panel-border)] bg-[var(--panel-background)] p-2 shadow-lg">
        {users.length === 0 && <p className="text-xs text-[var(--foreground)]/60">No users found</p>}
        {users.map((user) => (
          <label key={user.id} className="flex cursor-pointer items-center gap-2 py-1 text-xs">
            <input
              type="checkbox"
              checked={value.includes(user.id)}
              onChange={() => toggleUser(user.id)}
              className="h-3.5 w-3.5"
            />
            <span className="truncate">{user.email}</span>
          </label>
        ))}
      </div>
    </details>
  )
}

function mapApiJob(apiJob: ApiJob, fallback: JobRow | null): JobRow {
  return {
    id: apiJob.id,
    name: apiJob.name,
    address: apiJob.address,
    propertyName: apiJob.propertyName,
    contactName: apiJob.contactName,
    contactNumber: apiJob.contactNumber,
    budget: String(apiJob.budget),
    assignedUserIds: (apiJob.assignees ?? []).map((assignee) => assignee.user.id),
    pendingExpenses: fallback?.pendingExpenses ?? "0.00",
    createdAt: apiJob.createdAt ?? fallback?.createdAt ?? new Date().toISOString(),
  }
}

export default function JobsClient({
  initialJobs,
  users,
  canUseTools,
  moduleButtons,
}: {
  initialJobs: JobRow[]
  users: UserOption[]
  canUseTools: boolean
  moduleButtons: ModuleButton[]
}) {
  const router = useRouter()
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs)
  const [drafts, setDrafts] = useState<Record<string, DraftJob>>({})
  const [newDraft, setNewDraft] = useState<DraftJob>(defaultDraft)
  const [showNewRow, setShowNewRow] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user.email])), [users])

  function getDraft(job: JobRow): DraftJob {
    return drafts[job.id] ?? {
      id: job.id,
      name: job.name,
      address: job.address,
      propertyName: job.propertyName,
      contactName: job.contactName,
      contactNumber: job.contactNumber,
      budget: job.budget,
      assignedUserIds: job.assignedUserIds,
    }
  }

  function updateDraftField(id: string, field: Exclude<keyof DraftJob, "assignedUserIds" | "id">, value: string) {
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
            assignedUserIds: current.assignedUserIds,
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

  function updateDraftAssignedUsers(id: string, assignedUserIds: string[]) {
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
            assignedUserIds: current.assignedUserIds,
          }
        : defaultDraft

      return {
        ...prev,
        [id]: {
          ...(prev[id] ?? fallback),
          assignedUserIds,
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

      setJobs((prev) => prev.map((row) => (row.id === job.id ? mapApiJob(payload.job!, row) : row)))
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

      setJobs((prev) => [mapApiJob(payload.job!, null), ...prev])
      setNewDraft(defaultDraft)
      setShowNewRow(false)
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
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="w-full space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-blue-500">Jobs</h1>
          <div className="mt-3 flex flex-wrap gap-2">
            {moduleButtons.map((module) => {
              const canOpen = canUseTools && module.isUnlocked
              const href = canOpen ? module.path : "/dashboard/billing"
              return (
                <Link
                  key={module.slug}
                  href={href}
                  className="rounded-md border border-[var(--panel-border)] bg-[var(--panel-hover)] px-3 py-1 text-xs font-semibold text-blue-600 transition hover:bg-[var(--panel-border)]"
                >
                  {module.name}
                </Link>
              )
            })}
          </div>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">
            Manage jobs, assign users, and use the open button to view full job details.
          </p>

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

          <div className="mt-4 rounded-lg border border-[var(--panel-border)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1280px] text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Open</th>
                  <th className="px-3 py-2">Job Name</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Property Name</th>
                  <th className="px-3 py-2">Contact Name</th>
                  <th className="px-3 py-2">Contact Number</th>
                  <th className="px-3 py-2">Budget</th>
                  <th className="px-3 py-2">Assigned Users</th>
                  <th className="px-3 py-2">Pending Expenses</th>
                  <th className="px-3 py-2">Save</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                {showNewRow && (
                  <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                    <td className="px-3 py-2 text-[var(--foreground)]/60">-</td>
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.name}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.address}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, address: event.target.value }))}
                      className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.propertyName}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, propertyName: event.target.value }))}
                      className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.contactName}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, contactName: event.target.value }))}
                      className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.contactNumber}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, contactNumber: event.target.value }))}
                      className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={newDraft.budget}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, budget: event.target.value }))}
                      className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <UserMultiSelect
                      users={users}
                      value={newDraft.assignedUserIds}
                      onChange={(assignedUserIds) => setNewDraft((prev) => ({ ...prev, assignedUserIds }))}
                    />
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]/70">$0.00</td>
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
                )}

                {jobs.map((job) => {
                  const draft = getDraft(job)
                  const isSaving = savingId === job.id
                  const assignedUsers = draft.assignedUserIds
                    .map((userId) => usersById.get(userId))
                    .filter((email): email is string => Boolean(email))

                  return (
                    <tr key={job.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/35">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
                          className="inline-flex items-center rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-hover)]"
                          aria-label={`Open ${job.name || "job"}`}
                        >
                          <ExternalLink size={12} />
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.name}
                          onChange={(event) => updateDraftField(job.id, "name", event.target.value)}
                          className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.address}
                          onChange={(event) => updateDraftField(job.id, "address", event.target.value)}
                          className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.propertyName}
                          onChange={(event) => updateDraftField(job.id, "propertyName", event.target.value)}
                          className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.contactName}
                          onChange={(event) => updateDraftField(job.id, "contactName", event.target.value)}
                          className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.contactNumber}
                          onChange={(event) => updateDraftField(job.id, "contactNumber", event.target.value)}
                          className="w-36 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={draft.budget}
                          onChange={(event) => updateDraftField(job.id, "budget", event.target.value)}
                          className="w-28 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <UserMultiSelect
                          users={users}
                          value={draft.assignedUserIds}
                          onChange={(assignedUserIds) => updateDraftAssignedUsers(job.id, assignedUserIds)}
                        />
                        {assignedUsers.length > 0 && (
                          <p className="mt-1 max-w-56 truncate text-xs text-[var(--foreground)]/70">{assignedUsers.join(", ")}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 font-semibold text-amber-600">${job.pendingExpenses}</td>
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
                    <td colSpan={11} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No jobs yet.
                    </td>
                  </tr>
                )}
              </tbody>
              </table>
            </div>
            <div className="flex justify-end border-t border-[var(--panel-border)] px-3 py-2">
              <button
                type="button"
                onClick={() => setShowNewRow(true)}
                disabled={showNewRow}
                className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60"
              >
                <Plus size={13} /> Add Row
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
