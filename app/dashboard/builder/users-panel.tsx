"use client"

import { useEffect, useState } from "react"

type UserRow = {
  id: string
  email: string
  role: "CONTRACTOR" | "CUSTOMER" | "ADMIN" | "BUILDER"
  isVerified: boolean
  createdAt: string
  isMaster: boolean
  canRestrict: boolean
  canEditRole: boolean
}

type ToolRow = {
  id: string
  slug: string
  name: string
  description: string
  path: string
  monthlyPriceCents: number
  isActive: boolean
}

type ActivityRow = {
  id: string
  userEmail: string
  loggedInAt: string
}

type SectionState = {
  users: boolean
  tools: boolean
  activity: boolean
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

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

export default function BuilderUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [tools, setTools] = useState<ToolRow[]>([])
  const [activityRows, setActivityRows] = useState<ActivityRow[]>([])

  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingTools, setLoadingTools] = useState(true)
  const [activityLoading, setActivityLoading] = useState(false)

  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const [savingUserIds, setSavingUserIds] = useState<Set<string>>(new Set())
  const [savingToolIds, setSavingToolIds] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  const [viewerIsMaster, setViewerIsMaster] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null)
  const [activityError, setActivityError] = useState("")

  const [sectionsOpen, setSectionsOpen] = useState<SectionState>({
    users: true,
    tools: true,
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
      const payload = await apiJson<{ users: UserRow[]; viewerIsMaster: boolean }>("/api/builder/users")
      setUsers(payload.users)
      setViewerIsMaster(payload.viewerIsMaster)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users")
    } finally {
      setLoadingUsers(false)
    }
  }

  async function loadTools() {
    setLoadingTools(true)
    setError("")

    try {
      const payload = await apiJson<{ tools: ToolRow[] }>("/api/builder/tools")
      setTools(payload.tools)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load tools")
    } finally {
      setLoadingTools(false)
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
    void loadTools()
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
  }, [sectionsOpen.activity, activityLoaded])

  async function updateUser(userId: string, next: Partial<Pick<UserRow, "role" | "isVerified">>) {
    if (!viewerIsMaster) return

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

  async function updateTool(toolId: string, isActive: boolean) {
    if (!viewerIsMaster) return

    setMessage("")
    setError("")
    setSavingToolIds((prev) => new Set(prev).add(toolId))

    try {
      const payload = await apiJson<{ tool: ToolRow }>("/api/builder/tools", {
        method: "PATCH",
        body: JSON.stringify({ id: toolId, isActive }),
      })

      setTools((prev) => prev.map((tool) => (tool.id === toolId ? payload.tool : tool)))
      setMessage(`${payload.tool.name} ${payload.tool.isActive ? "enabled" : "disabled"}`)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Failed to update tool")
      await loadTools()
    } finally {
      setSavingToolIds((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(toolId)
        return nextSet
      })
    }
  }

  async function deleteUser(userId: string) {
    if (!viewerIsMaster) return

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
    if (!viewerIsMaster) return

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
            Manage users, tool availability, and recent account activity.
          </p>
          {!viewerIsMaster && (
            <p className="text-xs text-amber-400">Read-only for Builder users. Master accounts can edit.</p>
          )}
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
                            <div className="flex flex-col">
                              <span>{user.email}</span>
                              {user.isMaster && <span className="text-xs text-blue-500">Master Account</span>}
                            </div>
                          </td>
                          <td className="px-2 py-2">
                            <div className="flex flex-col gap-1">
                              <select
                                value={user.role}
                                disabled={!viewerIsMaster || !user.canEditRole || isSaving}
                                onClick={(event) => event.stopPropagation()}
                                onChange={(event) =>
                                  void updateUser(user.id, {
                                    role: event.target.value as UserRow["role"],
                                  })
                                }
                                className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-1 disabled:opacity-60"
                              >
                                <option value="CONTRACTOR">CONTRACTOR</option>
                                <option value="CUSTOMER">CUSTOMER</option>
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
                              disabled={!viewerIsMaster || !user.canRestrict || isSaving}
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
                disabled={isBulkUpdating || !viewerIsMaster}
                onClick={() => runBulkAction("restrictAll")}
                className="rounded-lg border border-rose-500/40 px-3 py-2 text-xs text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
              >
                Restrict All (Except Master)
              </button>
              <button
                type="button"
                disabled={isBulkUpdating || !viewerIsMaster}
                onClick={() => runBulkAction("verifyAll")}
                className="rounded-lg border border-emerald-500/40 px-3 py-2 text-xs text-emerald-700 transition hover:bg-emerald-500/10 disabled:opacity-60"
              >
                Verify All
              </button>
            </div>
          </div>
        </section>

        <section className="border border-[var(--panel-border)] bg-[var(--panel-background)]">
          {renderTableSectionHeader("Tools", "tools")}
          {sectionsOpen.tools ? (
            <>
              <div className="px-3 py-2 text-xs text-[var(--foreground)]/75 border-t border-[var(--panel-border)]">
                Toggle availability to control what tools appear in the dashboard menu and billable catalog.
              </div>
              <div className="overflow-x-auto border-t border-[var(--panel-border)]">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="px-2 py-2">Tool</th>
                      <th className="px-2 py-2">Description</th>
                      <th className="px-2 py-2">Price</th>
                      <th className="px-2 py-2">Path</th>
                      <th className="px-2 py-2">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTools ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-[var(--foreground)]/70">
                          Loading tools...
                        </td>
                      </tr>
                    ) : tools.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-[var(--foreground)]/70">
                          No tools found.
                        </td>
                      </tr>
                    ) : (
                      tools.map((tool) => {
                        const isSaving = savingToolIds.has(tool.id)

                        return (
                          <tr key={tool.id} className="border-t border-[var(--panel-border)]">
                            <td className="px-2 py-2">
                              <div className="font-medium">{tool.name}</div>
                              <div className="text-xs text-[var(--foreground)]/70">{tool.slug}</div>
                            </td>
                            <td className="px-2 py-2 text-[var(--foreground)]/85">{tool.description}</td>
                            <td className="px-2 py-2 text-[var(--foreground)]/85">{formatMoney(tool.monthlyPriceCents)}</td>
                            <td className="px-2 py-2 text-[var(--foreground)]/80">{tool.path}</td>
                            <td className="px-2 py-2">
                              <label className="inline-flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  aria-label={`Toggle ${tool.name} availability`}
                                  checked={tool.isActive}
                                  disabled={!viewerIsMaster || isSaving}
                                  onChange={(event) => void updateTool(tool.id, event.target.checked)}
                                  className="size-4"
                                />
                                <span className={`text-xs ${tool.isActive ? "text-emerald-500" : "text-rose-500"}`}>
                                  {tool.isActive ? "Active" : "Inactive"}
                                </span>
                              </label>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
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
                {selectedUser.isMaster ? "MASTER" : selectedUser.role}
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

            {viewerIsMaster && !selectedUser.isMaster && (
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
    </div>
  )
}
