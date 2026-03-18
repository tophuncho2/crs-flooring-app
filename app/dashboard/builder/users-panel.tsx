"use client"

import { useEffect, useState, type ReactNode } from "react"

type UserRow = {
  id: string
  email: string
  role: "ADMIN" | "BUILDER"
  isVerified: boolean
  createdAt: string
  canRestrict: boolean
  canEditRole: boolean
}

type ActivityRow = {
  id: string
  userEmail: string
  loggedInAt: string
}

type UnitOfMeasureRow = {
  id: string
  name: string
  createdAt: string
}

type SectionState = {
  users: boolean
  activity: boolean
  unitOfMeasures: boolean
}

type SectionId = keyof SectionState

async function apiJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>

  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : "Request failed"
    throw new Error(message)
  }

  return payload as T
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-blue-500">{title}</h2>
            <p className="text-sm text-[var(--foreground)]/70">Type a unit of measure name.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
          >
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export default function BuilderUsersPanel({ initialUnitOfMeasures }: { initialUnitOfMeasures: UnitOfMeasureRow[] }) {
  const [users, setUsers] = useState<UserRow[]>([])
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])
  const [unitOfMeasures, setUnitOfMeasures] = useState<UnitOfMeasureRow[]>(initialUnitOfMeasures)

  const [loadingUsers, setLoadingUsers] = useState(true)
  const [activityLoading, setActivityLoading] = useState(false)
  const [isSavingUnitOfMeasure, setIsSavingUnitOfMeasure] = useState(false)
  const [deletingUnitOfMeasureId, setDeletingUnitOfMeasureId] = useState<string | null>(null)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [savingUserIds, setSavingUserIds] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const [viewerCanManageUsers, setViewerCanManageUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [activityError, setActivityError] = useState("")
  const [isUnitOfMeasureModalOpen, setIsUnitOfMeasureModalOpen] = useState(false)
  const [editingUnitOfMeasure, setEditingUnitOfMeasure] = useState<UnitOfMeasureRow | null>(null)
  const [unitOfMeasureName, setUnitOfMeasureName] = useState("")

  const [sectionsOpen, setSectionsOpen] = useState<SectionState>({
    users: true,
    activity: false,
    unitOfMeasures: false,
  })

  const [activityLoaded, setActivityLoaded] = useState(false)

  function toggleSection(section: SectionId) {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  async function loadUsers() {
    setLoadingUsers(true)
    setError("")

    try {
      const payload = await apiJson<{ users: UserRow[]; viewerCanManageUsers: boolean }>("/api/builder/users")
      setUsers(payload.users)
      setViewerCanManageUsers(payload.viewerCanManageUsers)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users")
    } finally {
      setLoadingUsers(false)
    }
  }

  async function loadActivity() {
    setActivityError("")
    setActivityLoading(true)

    try {
      const payload = await apiJson<{ activity: ActivityRow[] }>("/api/builder/users/activity")
      setActivityRows(payload.activity)
      setActivityLoaded(true)
    } catch (loadError) {
      setActivityError(loadError instanceof Error ? loadError.message : "Failed to load user activity")
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  useEffect(() => {
    if (!sectionsOpen.activity) {
      return
    }

    if (!activityLoaded && activityRows.length === 0) {
      void loadActivity()
    }

    const timer = window.setInterval(() => {
      void loadActivity()
    }, 10000)

    return () => window.clearInterval(timer)
  }, [activityLoaded, activityRows.length, sectionsOpen.activity])

  async function updateUser(userId: string, next: Partial<Pick<UserRow, "role" | "isVerified">>) {
    if (!viewerCanManageUsers) return

    setMessage("")
    setError("")
    setSavingUserIds((prev) => new Set(prev).add(userId))

    try {
      const payload = await apiJson<{ user: UserRow }>(`/api/builder/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(next),
      })

      setUsers((prev) => prev.map((user) => (user.id === userId ? payload.user : user)))
      setMessage("User updated")
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update user")
    } finally {
      setSavingUserIds((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(userId)
        return nextSet
      })
    }
  }

  async function deleteUser(userId: string) {
    if (!viewerCanManageUsers) return

    setMessage("")
    setError("")
    setSavingUserIds((prev) => new Set(prev).add(userId))

    try {
      await apiJson<{ success: boolean }>(`/api/builder/users/${userId}`, {
        method: "DELETE",
      })

      setUsers((prev) => prev.filter((user) => user.id !== userId))
      setSelectedUser(null)
      setMessage("User deleted. They can be added back by signing up again.")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user")
    } finally {
      setSavingUserIds((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(userId)
        return nextSet
      })
    }
  }

  async function runBulkAction(action: "restrictAll" | "verifyAll") {
    if (!viewerCanManageUsers) return

    setMessage("")
    setError("")
    setIsBulkUpdating(true)

    try {
      await apiJson<{ success: boolean }>("/api/builder/users/bulk", {
        method: "POST",
        body: JSON.stringify({ action }),
      })
      await loadUsers()
      setMessage(action === "restrictAll" ? "All eligible users restricted" : "All users verified")
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : "Failed bulk update")
    } finally {
      setIsBulkUpdating(false)
    }
  }

  function openCreateUnitOfMeasure() {
    setMessage("")
    setError("")
    setEditingUnitOfMeasure(null)
    setUnitOfMeasureName("")
    setIsUnitOfMeasureModalOpen(true)
  }

  function openEditUnitOfMeasure(unit: UnitOfMeasureRow) {
    setMessage("")
    setError("")
    setEditingUnitOfMeasure(unit)
    setUnitOfMeasureName(unit.name)
    setIsUnitOfMeasureModalOpen(true)
  }

  async function saveUnitOfMeasure() {
    setMessage("")
    setError("")

    if (!unitOfMeasureName.trim()) {
      setError("Unit of measure is required")
      return
    }

    setIsSavingUnitOfMeasure(true)
    try {
      const payload = editingUnitOfMeasure
        ? await apiJson<{ unitOfMeasure: UnitOfMeasureRow }>(`/api/builder/unit-of-measures/${editingUnitOfMeasure.id}`, {
            method: "PATCH",
            body: JSON.stringify({ name: unitOfMeasureName }),
          })
        : await apiJson<{ unitOfMeasure: UnitOfMeasureRow }>("/api/builder/unit-of-measures", {
            method: "POST",
            body: JSON.stringify({ name: unitOfMeasureName }),
          })

      setUnitOfMeasures((prev) => {
        const next = editingUnitOfMeasure
          ? prev.map((unit) => (unit.id === payload.unitOfMeasure.id ? payload.unitOfMeasure : unit))
          : [...prev, payload.unitOfMeasure]
        return next.sort((a, b) => a.name.localeCompare(b.name))
      })
      setIsUnitOfMeasureModalOpen(false)
      setEditingUnitOfMeasure(null)
      setUnitOfMeasureName("")
      setMessage(editingUnitOfMeasure ? "Unit of measure updated" : "Unit of measure created")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save unit of measure")
    } finally {
      setIsSavingUnitOfMeasure(false)
    }
  }

  async function deleteUnitOfMeasure(unitId: string) {
    if (!window.confirm("Delete this unit of measure?")) return

    setMessage("")
    setError("")
    setDeletingUnitOfMeasureId(unitId)

    try {
      await apiJson<{ success: boolean }>(`/api/builder/unit-of-measures/${unitId}`, {
        method: "DELETE",
      })
      setUnitOfMeasures((prev) => prev.filter((unit) => unit.id !== unitId))
      if (editingUnitOfMeasure?.id === unitId) {
        setIsUnitOfMeasureModalOpen(false)
        setEditingUnitOfMeasure(null)
        setUnitOfMeasureName("")
      }
      setMessage("Unit of measure deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete unit of measure")
    } finally {
      setDeletingUnitOfMeasureId(null)
    }
  }

  function renderTableSectionHeader(label: string, section: SectionId) {
    const open = sectionsOpen[section]

    return (
      <button
        type="button"
        onClick={() => toggleSection(section)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-semibold text-blue-500 transition hover:bg-[var(--panel-hover)]"
        aria-expanded={open}
      >
        <span>{label}</span>
        <span className="text-xs tracking-wide text-[var(--foreground)]/70">{open ? "▾" : "▸"}</span>
      </button>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-6 pt-20 text-[var(--foreground)] sm:px-2 lg:px-3">
      <div className="w-full space-y-4">
        <div className="space-y-1 px-1">
          <h1 className="text-2xl font-bold text-blue-500">Builder Control Panel</h1>
          <p className="text-sm text-[var(--foreground)]/70">
            Manage users and recent account activity.
          </p>
        </div>

        {message && (
          <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{message}</p>
        )}
        {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <section className="border border-[var(--panel-border)] bg-[var(--panel-background)]">
          {renderTableSectionHeader("Users", "users")}
          {sectionsOpen.users ? (
            <div className="overflow-x-auto border-t border-[var(--panel-border)]">
              <table className="w-full text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    <th className="px-2 py-2">Email</th>
                    <th className="px-2 py-2">Role</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-[var(--foreground)]/70">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-[var(--foreground)]/70">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const isSaving = savingUserIds.has(user.id)
                      const statusLabel = user.isVerified ? "Verified" : "Pending Approval"

                      return (
                        <tr
                          key={user.id}
                          className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]/40"
                          onClick={() => setSelectedUser(user)}
                        >
                          <td className="px-2 py-2">
                            <span>{user.email}</span>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-col gap-1">
                              <select
                                value={user.role}
                                disabled={!viewerCanManageUsers || !user.canEditRole || isSaving}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  void updateUser(user.id, {
                                    role: event.target.value as UserRow["role"],
                                  })
                                }
                                className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-1 disabled:opacity-60"
                              >
                                <option value="ADMIN">ADMIN</option>
                                <option value="BUILDER">BUILDER</option>
                              </select>
                              {!user.isVerified && (
                                <span className="text-xs text-amber-400">PENDING APPROVAL</span>
                              )}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={user.isVerified ? "verified" : "restricted"}
                              disabled={!viewerCanManageUsers || !user.canRestrict || isSaving}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                void updateUser(user.id, {
                                  isVerified: event.target.value === "verified",
                                })
                              }
                              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-1 disabled:opacity-60"
                            >
                              <option value="verified">Verified</option>
                              <option value="restricted">Pending Approval</option>
                            </select>
                            {!user.canRestrict && (
                              <div className="mt-1 text-xs text-[var(--foreground)]/70">Always verified</div>
                            )}
                            {user.canRestrict && <div className="mt-1 text-xs text-[var(--foreground)]/70">{statusLabel}</div>}
                          </td>
                          <td className="px-2 py-2 text-xs text-[var(--foreground)]/80 md:text-sm">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="border-t border-[var(--panel-border)] px-2 py-2">
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={isBulkUpdating || !viewerCanManageUsers}
                onClick={() => runBulkAction("restrictAll")}
                className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
              >
                Restrict All (Except Master)
              </button>
              <button
                type="button"
                disabled={isBulkUpdating || !viewerCanManageUsers}
                onClick={() => runBulkAction("verifyAll")}
                className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs text-emerald-700 transition hover:bg-emerald-500/10 disabled:opacity-60"
              >
                Verify All
              </button>
            </div>
          </div>
        </section>

        <section className="border border-[var(--panel-border)] bg-[var(--panel-background)]">
          {renderTableSectionHeader("User Activity", "activity")}
          {sectionsOpen.activity ? (
            <div className="overflow-x-auto border-t border-[var(--panel-border)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--panel-border)] px-2 py-2">
                <p className="text-xs text-[var(--foreground)]/70">
                  Recent login events. Auto-refreshes every 10 seconds when opened.
                </p>
                <button
                  type="button"
                  onClick={() => void loadActivity()}
                  className="rounded-md border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)]"
                >
                  Refresh
                </button>
              </div>

              {activityError && (
                <p className="m-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
                  {activityError}
                </p>
              )}

              <table className="w-full text-sm">
                <thead className="bg-[var(--panel-hover)] text-left">
                  <tr>
                    <th className="px-2 py-2">User</th>
                    <th className="px-2 py-2">Logged In</th>
                  </tr>
                </thead>
                <tbody>
                  {activityLoading ? (
                    <tr>
                      <td colSpan={2} className="px-2 py-6 text-center text-[var(--foreground)]/70">
                        Loading activity...
                      </td>
                    </tr>
                  ) : activityRows.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-2 py-6 text-center text-[var(--foreground)]/70">
                        No login activity found.
                      </td>
                    </tr>
                  ) : (
                    activityRows.map((row) => (
                      <tr key={row.id} className="border-t border-[var(--panel-border)]">
                        <td className="px-2 py-2">{row.userEmail}</td>
                        <td className="px-2 py-2 text-[var(--foreground)]/80">{formatDate(row.loggedInAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <section className="border border-[var(--panel-border)] bg-[var(--panel-background)]">
          {renderTableSectionHeader("Unit of Measures", "unitOfMeasures")}
          {sectionsOpen.unitOfMeasures ? (
            <div className="border-t border-[var(--panel-border)]">
              <div className="flex items-center justify-end px-2 py-2">
                <button
                  type="button"
                  onClick={openCreateUnitOfMeasure}
                  className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
                >
                  Add UOM
                </button>
              </div>
              <div className="overflow-x-auto border-t border-[var(--panel-border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="px-2 py-2">Unit of Measure</th>
                      <th className="px-2 py-2">Created</th>
                      <th className="px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unitOfMeasures.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-6 text-center text-[var(--foreground)]/70">
                          No units of measure yet.
                        </td>
                      </tr>
                    ) : (
                      unitOfMeasures.map((unit) => (
                        <tr key={unit.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-2 py-2">{unit.name}</td>
                          <td className="px-2 py-2 text-[var(--foreground)]/80">{formatDate(unit.createdAt)}</td>
                          <td className="px-2 py-2">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => openEditUnitOfMeasure(unit)}
                                className="rounded-md border border-[var(--panel-border)] px-3 py-1 text-xs hover:bg-[var(--panel-hover)]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void deleteUnitOfMeasure(unit.id)}
                                disabled={deletingUnitOfMeasureId === unit.id}
                                className="rounded-md border border-rose-500/40 px-3 py-1 text-xs text-rose-600 hover:bg-rose-500/10 disabled:opacity-60"
                              >
                                {deletingUnitOfMeasureId === unit.id ? "Deleting..." : "Delete"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedUser(null)}>
          <div
            className="w-full max-w-md rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-blue-500">User Details</h2>
                <p className="text-sm text-[var(--foreground)]/70">Click outside to close.</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-md border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)]"
              >
                Close
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <p><span className="text-[var(--foreground)]/70">Email:</span> {selectedUser.email}</p>
              <p>
                <span className="text-[var(--foreground)]/70">Level:</span>{" "}
                {selectedUser.role}
              </p>
              <p>
                <span className="text-[var(--foreground)]/70">Status:</span>{" "}
                {selectedUser.isVerified ? "Verified" : "Pending Approval"}
              </p>
              <p>
                <span className="text-[var(--foreground)]/70">Created:</span>{" "}
                {formatDate(selectedUser.createdAt)}
              </p>
            </div>

            {viewerCanManageUsers && (
              <div className="mt-4 flex items-center justify-end">
                <button
                  type="button"
                  disabled={savingUserIds.has(selectedUser.id)}
                  onClick={() => void deleteUser(selectedUser.id)}
                  className="rounded-md border border-rose-500/40 px-3 py-2 text-sm text-rose-600 hover:bg-rose-500/10 disabled:opacity-60"
                >
                  {savingUserIds.has(selectedUser.id) ? "Deleting..." : "Delete User"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isUnitOfMeasureModalOpen ? (
        <ModalShell
          title={editingUnitOfMeasure ? "Edit Unit of Measure" : "Add Unit of Measure"}
          onClose={() => {
            if (!isSavingUnitOfMeasure) {
              setIsUnitOfMeasureModalOpen(false)
            }
          }}
        >
          <div className="space-y-4">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-[var(--foreground)]/80">Unit of Measure</span>
              <input
                value={unitOfMeasureName}
                onChange={(event) => setUnitOfMeasureName(event.target.value)}
                className="rounded-lg border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsUnitOfMeasureModalOpen(false)}
                className="rounded-lg border border-[var(--panel-border)] px-3 py-2 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveUnitOfMeasure()}
                disabled={isSavingUnitOfMeasure}
                className="rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400 disabled:opacity-60"
              >
                {isSavingUnitOfMeasure ? "Saving..." : "Save UOM"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
