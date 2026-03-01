"use client"

import { useEffect, useState } from "react"

type UserRow = {
  id: string
  email: string
  role: "CONTRACTOR" | "ADMIN" | "BUILDER"
  isVerified: boolean
  createdAt: string
  isMaster: boolean
  canRestrict: boolean
  canEditRole: boolean
}

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

export default function BuilderUsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [isBulkUpdating, setIsBulkUpdating] = useState(false)

  async function loadUsers() {
    setLoading(true)
    setError("")

    try {
      const payload = await apiJson<{ users: UserRow[] }>("/api/builder/users")
      setUsers(payload.users)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  async function updateUser(userId: string, next: Partial<Pick<UserRow, "role" | "isVerified">>) {
    setMessage("")
    setError("")
    setSavingIds((prev) => new Set(prev).add(userId))

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
      setSavingIds((prev) => {
        const nextSet = new Set(prev)
        nextSet.delete(userId)
        return nextSet
      })
    }
  }

  async function runBulkAction(action: "restrictAll" | "verifyAll") {
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

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-8 pt-20 text-[var(--foreground)] sm:px-6 sm:pt-24 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Builder Control Panel</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Manage user roles and verification lockdown status.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => runBulkAction("restrictAll")}
              className="rounded-lg border border-rose-500/40 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
            >
              Restrict All (Except Builder + Master)
            </button>
            <button
              type="button"
              disabled={isBulkUpdating}
              onClick={() => runBulkAction("verifyAll")}
              className="rounded-lg border border-emerald-500/40 px-3 py-2 text-sm text-emerald-700 transition hover:bg-emerald-500/10 disabled:opacity-60"
            >
              Verify All
            </button>
          </div>
        </div>

        {message && <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700">{message}</p>}
        {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const isSaving = savingIds.has(user.id)
                    const statusLabel = user.isVerified ? "Verified" : "Pending Approval"

                    return (
                      <tr key={user.id} className="border-t border-[var(--panel-border)]">
                        <td className="px-3 py-2">
                          <div className="flex flex-col">
                            <span>{user.email}</span>
                            {user.isMaster && (
                              <span className="text-xs text-blue-500">Master Account</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex flex-col gap-1">
                            <select
                              value={user.role}
                              disabled={!user.canEditRole || isSaving}
                              onChange={(event) =>
                                void updateUser(user.id, {
                                  role: event.target.value as UserRow["role"],
                                })
                              }
                              className="rounded-md border border-[var(--panel-border)] bg-transparent px-2 py-1 disabled:opacity-60"
                            >
                              <option value="CONTRACTOR">CONTRACTOR</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="BUILDER">BUILDER</option>
                            </select>
                            {!user.isVerified && (
                              <span className="text-xs text-amber-400">PENDING APPROVAL</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={user.isVerified ? "verified" : "restricted"}
                            disabled={!user.canRestrict || isSaving}
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
                          {user.canRestrict && (
                            <div className="mt-1 text-xs text-[var(--foreground)]/70">{statusLabel}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-[var(--foreground)]/70">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
