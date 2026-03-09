"use client"

import { useState } from "react"

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

type PropertyOption = {
  id: string
  name: string
}

type DraftCompany = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  propertyIds: string[]
}

const defaultDraft: DraftCompany = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  propertyIds: [],
}

function toSelectedValues(event: React.ChangeEvent<HTMLSelectElement>) {
  return Array.from(event.target.selectedOptions).map((option) => option.value)
}

function computeFullAddress(value: { streetAddress: string; city: string; state: string; zip: string }) {
  return [value.streetAddress, value.city, value.state, value.zip].filter(Boolean).join(", ")
}

export default function ManagementCompaniesClient({
  initialCompanies,
  propertyOptions,
}: {
  initialCompanies: ManagementCompanyRow[]
  propertyOptions: PropertyOption[]
}) {
  const [companies, setCompanies] = useState<ManagementCompanyRow[]>(initialCompanies)
  const [drafts, setDrafts] = useState<Record<string, DraftCompany>>({})
  const [newDraft, setNewDraft] = useState<DraftCompany>(defaultDraft)
  const [showNewRow, setShowNewRow] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

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
      state: row.state,
      zip: row.zip,
      phone: row.phone,
      email: row.email,
      propertyIds: row.properties.map((property) => property.id),
    }
  }

  function setDraftField(id: string, field: keyof DraftCompany, value: string | string[]) {
    setDrafts((prev) => {
      const base = getDraft(id)
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: value,
        },
      }
    })
  }

  function setNewDraftField(field: keyof DraftCompany, value: string | string[]) {
    setNewDraft((prev) => ({ ...prev, [field]: value }))
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
      setShowNewRow(false)
      setNewDraft(defaultDraft)
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
    <div className="min-h-screen bg-[var(--background)] px-2 pb-12 pt-20 text-[var(--foreground)] sm:px-3 sm:pt-24 lg:px-4">
      <section className="mx-auto w-full max-w-7xl rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <h1 className="text-2xl font-bold text-blue-500">Management Companies</h1>
        <p className="mt-1 text-sm text-[var(--foreground)]/70">
          Manage management company records and their linked property relationships.
        </p>

        {message && <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
        {error && <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-4 overflow-x-auto rounded-lg border border-[var(--panel-border)]">
          <table className="w-full min-w-[1400px] text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="px-3 py-2">Company</th>
                <th className="px-3 py-2">Street</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Zip</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Full Address</th>
                <th className="px-3 py-2">Properties</th>
                <th className="px-3 py-2">Save</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {showNewRow && (
                <tr className="border-t border-[var(--panel-border)] bg-[var(--panel-hover)]/30">
                  <td className="px-3 py-2"><input value={newDraft.name} onChange={(event) => setNewDraftField("name", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={newDraft.streetAddress} onChange={(event) => setNewDraftField("streetAddress", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={newDraft.city} onChange={(event) => setNewDraftField("city", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={newDraft.state} onChange={(event) => setNewDraftField("state", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={newDraft.zip} onChange={(event) => setNewDraftField("zip", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={newDraft.phone} onChange={(event) => setNewDraftField("phone", event.target.value)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2"><input value={newDraft.email} onChange={(event) => setNewDraftField("email", event.target.value)} className="w-52 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" /></td>
                  <td className="px-3 py-2">{computeFullAddress(newDraft)}</td>
                  <td className="px-3 py-2">
                    <select
                      multiple
                      value={newDraft.propertyIds}
                      onChange={(event) => setNewDraftField("propertyIds", toSelectedValues(event))}
                      className="min-h-16 w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    >
                      {propertyOptions.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => void createCompany()}
                      disabled={isSavingNew}
                      className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                    >
                      {isSavingNew ? "Adding..." : "Add"}
                    </button>
                  </td>
                  <td className="px-3 py-2">-</td>
                </tr>
              )}

              {companies.map((row) => {
                const draft = getDraft(row.id)
                const linkedProperties = row.properties.map((property) => property.name).join(", ") || "-"

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
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
                      <input value={draft.state} onChange={(event) => setDraftField(row.id, "state", event.target.value)} className="w-24 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
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
                      <select
                        multiple
                        value={draft.propertyIds}
                        onChange={(event) => setDraftField(row.id, "propertyIds", toSelectedValues(event))}
                        className="min-h-16 w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        {propertyOptions.map((property) => (
                          <option key={property.id} value={property.id}>
                            {property.name}
                          </option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-[var(--foreground)]/60">{linkedProperties}</p>
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

              {companies.length === 0 && !showNewRow && (
                <tr>
                  <td colSpan={11} className="px-3 py-8 text-center text-[var(--foreground)]/70">No management companies yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={() => setShowNewRow(true)} disabled={showNewRow} className="rounded border border-[var(--panel-border)] px-3 py-1 text-sm hover:bg-[var(--panel-hover)] disabled:opacity-60">Add Row</button>
          <a href="/dashboard/flooring" className="text-sm text-[var(--foreground)]/70 hover:text-[var(--foreground)]">Back to flooring</a>
        </div>
      </section>
    </div>
  )
}
