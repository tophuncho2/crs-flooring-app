"use client"

import { type ReactNode, useState } from "react"
import { Plus, X } from "lucide-react"

type ManagementCompanyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  properties: { id: string; name: string; fullAddress: string }[]
}

type DraftCompany = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
}

const defaultDraft: DraftCompany = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
}

function normalizeState(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
}

function computeFullAddress(value: { streetAddress: string; city: string; state: string; zip: string }) {
  return [value.streetAddress, value.city, value.state, value.zip].filter(Boolean).join(", ")
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
            >
              <X size={18} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-[var(--foreground)]/80">{label}</span>
      {children}
    </label>
  )
}

export default function ManagementCompaniesClient({
  initialCompanies,
}: {
  initialCompanies: ManagementCompanyRow[]
}) {
  const [companies, setCompanies] = useState<ManagementCompanyRow[]>(initialCompanies)
  const [drafts, setDrafts] = useState<Record<string, DraftCompany>>({})
  const [newDraft, setNewDraft] = useState<DraftCompany>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [selectedCompany, setSelectedCompany] = useState<ManagementCompanyRow | null>(null)

  function getDraft(id: string): DraftCompany {
    if (drafts[id]) {
      return drafts[id]
    }

    const row = companies.find((company) => company.id === id)
    if (!row) {
      return defaultDraft
    }

    return {
      name: row.name,
      streetAddress: row.streetAddress,
      city: row.city,
      state: normalizeState(row.state),
      zip: row.zip,
      phone: row.phone,
      email: row.email,
    }
  }

  function setDraftField(id: string, field: keyof DraftCompany, value: string | string[]) {
    setDrafts((prev) => {
      const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
      const base = getDraft(id)
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: normalizedValue,
        },
      }
    })
  }

  function setNewDraftField(field: keyof DraftCompany, value: string | string[]) {
    const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
    setNewDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  function openCompany(company: ManagementCompanyRow) {
    setSelectedCompany(company)
  }

  async function createCompany() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.name.trim()) {
        throw new Error("Company name is required")
      }

      const response = await fetch("/api/management-companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDraft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        managementCompany?: {
          id: string
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          postalCode: string | null
          phone: string | null
          email: string | null
          properties: Array<{ id: string; name: string; fullAddress: string }>
        }
      }

      if (!response.ok || !payload.managementCompany) {
        throw new Error(payload.error ?? "Failed to create company")
      }

      const payloadCompany = payload.managementCompany
      const newCompany: ManagementCompanyRow = {
        id: payloadCompany.id,
        name: payloadCompany.name,
        streetAddress: payloadCompany.streetAddress ?? "",
        city: payloadCompany.city ?? "",
        state: payloadCompany.state ?? "",
        zip: payloadCompany.postalCode ?? "",
        phone: payloadCompany.phone ?? "",
        email: payloadCompany.email ?? "",
        fullAddress: computeFullAddress({
          streetAddress: payloadCompany.streetAddress ?? "",
          city: payloadCompany.city ?? "",
          state: payloadCompany.state ?? "",
          zip: payloadCompany.postalCode ?? "",
        }),
        properties: payloadCompany.properties,
      }

      setCompanies((prev) => [newCompany, ...prev])
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      setMessage("Management company created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create company")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveCompany(row: ManagementCompanyRow) {
    setError("")
    setMessage("")
    setIsSavingId(row.id)

    try {
      const draft = getDraft(row.id)
      const response = await fetch(`/api/management-companies/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        managementCompany?: {
          id: string
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          postalCode: string | null
          phone: string | null
          email: string | null
          properties: Array<{ id: string; name: string; fullAddress: string }>
        }
      }

      if (!response.ok || !payload.managementCompany) {
        throw new Error(payload.error ?? "Failed to save company")
      }

      const company = payload.managementCompany
      const updatedCompany: ManagementCompanyRow = {
        id: company.id,
        name: company.name,
        streetAddress: company.streetAddress ?? "",
        city: company.city ?? "",
        state: company.state ?? "",
        zip: company.postalCode ?? "",
        phone: company.phone ?? "",
        email: company.email ?? "",
        fullAddress: computeFullAddress({
          streetAddress: company.streetAddress ?? "",
          city: company.city ?? "",
          state: company.state ?? "",
          zip: company.postalCode ?? "",
        }),
        properties: company.properties,
      }

      setCompanies((prev) => prev.map((item) => (item.id === row.id ? updatedCompany : item)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Management company saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save company")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteCompany(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/management-companies/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete company")
      }

      setCompanies((prev) => prev.filter((company) => company.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage("Management company deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete company")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Management Companies</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Manage management company records and their linked property relationships.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setMessage("")
              setError("")
              setNewDraft(defaultDraft)
              setIsCreateModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-semibold text-black hover:bg-blue-400"
          >
            <Plus size={16} />
            Company
          </button>
        </div>

        {message && (
          <p className="mt-3 border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">
            {message}
          </p>
        )}
        {error && (
          <p className="mt-3 border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">
            {error}
          </p>
        )}

        <div className="mt-6 mb-4 flex items-center justify-between">
          <span className="text-xs text-[var(--foreground)]/60">{companies.length} total</span>
        </div>

        <div className="overflow-x-auto border-y border-[var(--panel-border)]">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="h-10 px-3 py-2">Open</th>
                <th className="h-10 px-3 py-2">Company</th>
                <th className="h-10 px-3 py-2">Street</th>
                <th className="h-10 px-3 py-2">City</th>
                <th className="h-10 px-3 py-2">State</th>
                <th className="h-10 px-3 py-2">Zip</th>
                <th className="h-10 px-3 py-2">Phone</th>
                <th className="h-10 px-3 py-2">Email</th>
                <th className="h-10 px-3 py-2">Full Address</th>
                <th className="h-10 px-3 py-2">Properties</th>
                <th className="h-10 px-3 py-2">Save</th>
                <th className="h-10 px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((row) => {
                const draft = getDraft(row.id)
                const linkedProperties = row.properties.map((property) => property.name).join(", ") || "-"

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => openCompany(row)}
                        className="rounded border border-[var(--panel-border)] px-2 py-1 text-xs hover:bg-[var(--panel-hover)]"
                      >
                        Open
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.name} onChange={(event) => setDraftField(row.id, "name", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.streetAddress} onChange={(event) => setDraftField(row.id, "streetAddress", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.city} onChange={(event) => setDraftField(row.id, "city", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        value={draft.state}
                        onChange={(event) => setDraftField(row.id, "state", event.target.value)}
                        onBlur={(event) => setDraftField(row.id, "state", event.target.value)}
                        maxLength={2}
                        className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.zip} onChange={(event) => setDraftField(row.id, "zip", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.phone} onChange={(event) => setDraftField(row.id, "phone", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">
                      <input value={draft.email} onChange={(event) => setDraftField(row.id, "email", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                    </td>
                    <td className="px-3 py-2">{computeFullAddress(draft)}</td>
                    <td className="px-3 py-2">
                      <p className="text-xs text-[var(--foreground)]/70">{linkedProperties}</p>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void saveCompany(row)}
                        disabled={isSavingId === row.id}
                        className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                      >
                        {isSavingId === row.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void deleteCompany(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {companies.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-[var(--foreground)]/70">No management companies yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>

      {isCreateModalOpen ? (
        <ModalShell title="New Management Company" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Company Name">
                <input value={newDraft.name} onChange={(event) => setNewDraftField("name", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Street Address">
                <input value={newDraft.streetAddress} onChange={(event) => setNewDraftField("streetAddress", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="City">
                <input value={newDraft.city} onChange={(event) => setNewDraftField("city", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="State">
                <input value={newDraft.state} onChange={(event) => setNewDraftField("state", event.target.value)} maxLength={2} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Zip">
                <input value={newDraft.zip} onChange={(event) => setNewDraftField("zip", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Phone">
                <input value={newDraft.phone} onChange={(event) => setNewDraftField("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Email">
                <input value={newDraft.email} onChange={(event) => setNewDraftField("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Full Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {computeFullAddress(newDraft) || "Company address preview"}
                </div>
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void createCompany()} disabled={isSavingNew} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingNew ? "Creating..." : "Create Company"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {selectedCompany ? (
        <ModalShell title={selectedCompany.name} onClose={() => setSelectedCompany(null)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Address</p>
                <p className="mt-1 font-medium">{selectedCompany.fullAddress || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Phone</p>
                <p className="mt-1 font-medium">{selectedCompany.phone || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Email</p>
                <p className="mt-1 font-medium">{selectedCompany.email || "-"}</p>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--foreground)]">Owned Properties</h3>
              {selectedCompany.properties.length === 0 ? (
                <p className="text-sm text-[var(--foreground)]/70">No properties linked.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {selectedCompany.properties.map((property) => (
                    <li key={property.id} className="rounded border border-[var(--panel-border)] p-2">
                      <p className="font-medium text-[var(--foreground)]">{property.name}</p>
                      <p className="text-[var(--foreground)]/70">{property.fullAddress}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
