"use client"

import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

type VendorRow = {
  id: string
  companyName: string
  phone: string
  email: string
  createdAt: string
}

type ApiVendor = {
  id: string
  companyName: string
  phone: string | null
  email: string | null
  createdAt?: string
}

type DraftVendor = {
  companyName: string
  phone: string
  email: string
}

const defaultDraft: DraftVendor = {
  companyName: "",
  phone: "",
  email: "",
}

export default function VendorsClient({ initialVendors }: { initialVendors: VendorRow[] }) {
  const [vendors, setVendors] = useState<VendorRow[]>(initialVendors)
  const [drafts, setDrafts] = useState<Record<string, DraftVendor>>({})
  const [newDraft, setNewDraft] = useState<DraftVendor>(defaultDraft)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  function getDraft(vendor: VendorRow): DraftVendor {
    return drafts[vendor.id] ?? {
      companyName: vendor.companyName,
      phone: vendor.phone,
      email: vendor.email,
    }
  }

  function updateDraft(id: string, field: keyof DraftVendor, value: string) {
    setDrafts((prev) => {
      const current = vendors.find((vendor) => vendor.id === id)
      const fallback: DraftVendor = current
        ? {
            companyName: current.companyName,
            phone: current.phone,
            email: current.email,
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

  async function createVendor() {
    setIsSavingNew(true)
    setMessage("")
    setError("")

    try {
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as { vendor?: ApiVendor; error?: string }
      if (!response.ok || !payload.vendor) {
        throw new Error(payload.error ?? "Failed to create vendor")
      }
      const createdVendor = payload.vendor

      setVendors((prev) => [
        {
          id: createdVendor.id,
          companyName: createdVendor.companyName,
          phone: createdVendor.phone ?? "",
          email: createdVendor.email ?? "",
          createdAt: createdVendor.createdAt ?? new Date().toISOString(),
        },
        ...prev,
      ])
      setNewDraft(defaultDraft)
      setMessage("Vendor created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create vendor")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveVendor(vendor: VendorRow) {
    setSavingId(vendor.id)
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/vendors/${vendor.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(getDraft(vendor)),
      })

      const payload = (await response.json().catch(() => ({}))) as { vendor?: ApiVendor; error?: string }
      if (!response.ok || !payload.vendor) {
        throw new Error(payload.error ?? "Failed to save vendor")
      }

      setVendors((prev) =>
        prev.map((row) =>
          row.id === vendor.id
            ? {
                ...row,
                companyName: payload.vendor!.companyName,
                phone: payload.vendor!.phone ?? "",
                email: payload.vendor!.email ?? "",
              }
            : row,
        ),
      )

      setDrafts((prev) => {
        const next = { ...prev }
        delete next[vendor.id]
        return next
      })
      setMessage("Vendor saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save vendor")
    } finally {
      setSavingId(null)
    }
  }

  async function deleteVendor(vendorId: string) {
    setMessage("")
    setError("")

    try {
      const response = await fetch(`/api/vendors/${vendorId}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete vendor")
      }

      setVendors((prev) => prev.filter((vendor) => vendor.id !== vendorId))
      setMessage("Vendor deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete vendor")
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pb-12 pt-20 text-[var(--foreground)] sm:px-6 sm:pt-24 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
          <h1 className="text-2xl font-bold text-blue-500">Vendors</h1>
          <p className="mt-1 text-sm text-[var(--foreground)]/70">Manage vendor contacts used across jobs.</p>

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
                  <th className="px-3 py-2">Company Name</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Save</th>
                  <th className="px-3 py-2">Delete</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.companyName}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, companyName: event.target.value }))}
                      className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.phone}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, phone: event.target.value }))}
                      className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={newDraft.email}
                      onChange={(event) => setNewDraft((prev) => ({ ...prev, email: event.target.value }))}
                      className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void createVendor()}
                      disabled={isSavingNew}
                      className="inline-flex items-center gap-1 rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      <Plus size={13} /> {isSavingNew ? "Saving..." : "Add"}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-[var(--foreground)]/60">-</td>
                </tr>

                {vendors.map((vendor) => {
                  const draft = getDraft(vendor)
                  const isSaving = savingId === vendor.id

                  return (
                    <tr key={vendor.id} className="border-t border-[var(--panel-border)]">
                      <td className="px-3 py-2">
                        <input
                          value={draft.companyName}
                          onChange={(event) => updateDraft(vendor.id, "companyName", event.target.value)}
                          className="w-64 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.phone}
                          onChange={(event) => updateDraft(vendor.id, "phone", event.target.value)}
                          className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.email}
                          onChange={(event) => updateDraft(vendor.id, "email", event.target.value)}
                          className="w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void saveVendor(vendor)}
                          disabled={isSaving}
                          className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                        >
                          {isSaving ? "Saving..." : "Save"}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void deleteVendor(vendor.id)}
                          className="rounded p-2 text-rose-600 transition hover:bg-rose-500/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {vendors.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-[var(--foreground)]/70">
                      No vendors yet.
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
