"use client"

import { useEffect, useState } from "react"
import { DASHBOARD_PAGE_SHELL_DENSE_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/dashboard-card-title"
import { formatStableDate, formatStableDateTime } from "@/features/flooring/shared/date-format"
import { requestJson } from "@/features/flooring/shared/http"

type UserRow = {
  id: string
  email: string
  role: "OWNER" | "ADMIN" | "BUILDER"
  isVerified: boolean
  createdAt: string
  canRestrict: boolean
  canEditRole: boolean
  canDelete: boolean
}

type ActivityRow = {
  id: string
  userEmail: string
  loggedInAt: string
}

type SectionState = {
  users: boolean
  activity: boolean
}

type SectionId = keyof SectionState

function formatDate(value: string) {
  return formatStableDateTime(value)
}

export default function BuilderUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])

  const [loadingUsers, setLoadingUsers] = useState(true)
  const [activityLoading, setActivityLoading] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [savingUserIds, setSavingUserIds] = useState<Set<string>>(new Set())

  const [viewerCanManageUsers, setViewerCanManageUsers] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [activityError, setActivityError] = useState("")

  const [sectionsOpen, setSectionsOpen] = useState<SectionState>({
    users: true,
    activity: false,
  })

  const [activityLoaded, setActivityLoaded] = useState(false)

  function toggleSection(section: SectionId) {
    setSectionsOpen((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  async function loadUsers() {
    setLoadingUsers(true)
    setError("")

    try {
      const payload = await requestJson<{ users: UserRow[]; viewerCanManageUsers: boolean }>("/api/builder/users")
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
      const payload = await requestJson<{ activity: ActivityRow[] }>("/api/builder/users/activity")
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

  async function updateUser(userId: string, next: Partial<Pick<UserRow, "isVerified">>) {
    if (!viewerCanManageUsers) return

    setMessage("")
    setError("")
    setSavingUserIds((prev) => new Set(prev).add(userId))

    try {
      const payload = await requestJson<{ user: UserRow }>(`/api/builder/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
      await requestJson<{ success: boolean }>(`/api/builder/users/${userId}`, {
        method: "DELETE",
      })

      setUsers((prev) => prev.filter((user) => user.id !== userId))
      setSelectedUser(null)
      setMessage("User deleted. They can be added back through an account request or admin-created account.")
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
    <div className={DASHBOARD_PAGE_SHELL_DENSE_CLASS_NAME}>
      <div className="w-full space-y-4">
        <div className="space-y-1 px-1">
          <DashboardCardTitle>Admin Control Panel</DashboardCardTitle>
          <p className="text-sm text-[var(--foreground)]/70">
            Govern builder approvals and review recent account activity.
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
                              <span className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-1">
                                {user.role}
                              </span>
                              {user.role === "BUILDER" && !user.isVerified ? (
                                <span className="text-xs text-amber-400">PENDING APPROVAL</span>
                              ) : null}
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
                            {user.canRestrict ? (
                              <div className="mt-1 text-xs text-[var(--foreground)]/70">{statusLabel}</div>
                            ) : (
                              <div className="mt-1 text-xs text-[var(--foreground)]/70">Governance role. Managed outside panel.</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-xs text-[var(--foreground)]/80 md:text-sm">
                            {formatStableDate(user.createdAt)}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
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
                  disabled={!selectedUser.canDelete || savingUserIds.has(selectedUser.id)}
                  onClick={() => void deleteUser(selectedUser.id)}
                  className="rounded-md border border-rose-500/40 px-3 py-2 text-sm text-rose-600 hover:bg-rose-500/10 disabled:opacity-60"
                >
                  {savingUserIds.has(selectedUser.id) ? "Deleting..." : selectedUser.canDelete ? "Delete User" : "Delete Blocked"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
