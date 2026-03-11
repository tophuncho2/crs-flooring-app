"use client"

import { type ReactNode, useState } from "react"
import { Plus, X } from "lucide-react"

type ManagementCompanyOption = {
  id: string
  name: string
}

type PropertyManagementCompany = {
  id: string
  name: string
}

type PropertyRow = {
  id: string
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  fullAddress: string
  managementCompany: PropertyManagementCompany | null
  templates: Array<{
    id: string
    templateTag: string
    warehouseName: string
    itemsCount: number
  }>
}

type DraftProperty = {
  name: string
  streetAddress: string
  city: string
  state: string
  zip: string
  phone: string
  email: string
  managementCompanyId: string
}

const defaultDraft: DraftProperty = {
  name: "",
  streetAddress: "",
  city: "",
  state: "",
  zip: "",
  phone: "",
  email: "",
  managementCompanyId: "",
}

function normalizeState(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 2)
    .toUpperCase()
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

function computeFullAddress(address: { streetAddress: string; city: string; state: string; zip: string }) {
  return [address.streetAddress, address.city, address.state, address.zip].filter(Boolean).join(", ")
}

function getManagementCompanyId(row: PropertyRow): string {
  return row.managementCompany?.id ?? ""
}

export default function PropertiesClient({
  initialProperties,
  managementOptions,
}: {
  initialProperties: PropertyRow[]
  managementOptions: ManagementCompanyOption[]
}) {
  const [properties, setProperties] = useState<PropertyRow[]>(initialProperties)
  const [drafts, setDrafts] = useState<Record<string, DraftProperty>>({})
  const [newDraft, setNewDraft] = useState<DraftProperty>(defaultDraft)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isSavingNew, setIsSavingNew] = useState(false)
  const [isSavingId, setIsSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [selectedProperty, setSelectedProperty] = useState<PropertyRow | null>(null)

  function getDraft(id: string): DraftProperty {
    if (drafts[id]) {
      return drafts[id]
    }

    const row = properties.find((property) => property.id === id)
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
      managementCompanyId: getManagementCompanyId(row),
    }
  }

  function setDraftField(id: string, field: keyof DraftProperty, value: string | string[]) {
    setDrafts((prev) => {
      const base = getDraft(id)
      const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
      return {
        ...prev,
        [id]: {
          ...base,
          [field]: normalizedValue,
        },
      }
    })
  }

  function setNewDraftField(field: keyof DraftProperty, value: string | string[]) {
    const normalizedValue = field === "state" && typeof value === "string" ? normalizeState(value) : value
    setNewDraft((prev) => ({ ...prev, [field]: normalizedValue }))
  }

  async function createProperty() {
    setError("")
    setMessage("")
    setIsSavingNew(true)

    try {
      if (!newDraft.name.trim()) {
        throw new Error("Property name is required")
      }

      const response = await fetch("/api/properties-hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newDraft,
          managementCompanyId: newDraft.managementCompanyId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        property?: PropertyRow & {
          managementCompany: {
            id: string
            name: string
          } | null
          templates?: PropertyRow["templates"]
        }
      }

      if (!response.ok || !payload.property) {
        throw new Error(payload.error ?? "Failed to create property")
      }

      const createdProperty = {
        ...payload.property,
        templates: payload.property.templates ?? [],
      }
      setProperties((prev) => [createdProperty, ...prev])
      setNewDraft(defaultDraft)
      setIsCreateModalOpen(false)
      setMessage("Property created")
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create property")
    } finally {
      setIsSavingNew(false)
    }
  }

  async function saveProperty(row: PropertyRow) {
    setError("")
    setMessage("")
    setIsSavingId(row.id)

    try {
      const draft = getDraft(row.id)
      const response = await fetch(`/api/properties-hub/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...draft,
          managementCompanyId: draft.managementCompanyId || null,
        }),
      })

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string
        property?: {
          id: string
          name: string
          streetAddress: string | null
          city: string | null
          state: string | null
          zip: string | null
          phone: string | null
          email: string | null
          managementCompany: { id: string; name: string } | null
          fullAddress: string
          templates?: PropertyRow["templates"]
        }
      }

      if (!response.ok || !payload.property) {
        throw new Error(payload.error ?? "Failed to save property")
      }

      const nextProperty = {
        id: payload.property.id,
        name: payload.property.name,
        streetAddress: payload.property.streetAddress ?? "",
        city: payload.property.city ?? "",
        state: payload.property.state ?? "",
        zip: payload.property.zip ?? "",
        phone: payload.property.phone ?? "",
        email: payload.property.email ?? "",
        fullAddress: payload.property.fullAddress,
        managementCompany: payload.property.managementCompany,
        templates: payload.property.templates ?? row.templates,
      }

      setProperties((prev) => prev.map((property) => (property.id === row.id ? nextProperty : property)))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[row.id]
        return next
      })
      setMessage("Property saved")
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save property")
    } finally {
      setIsSavingId(null)
    }
  }

  async function deleteProperty(id: string) {
    setError("")
    setMessage("")
    setDeletingId(id)

    try {
      const response = await fetch(`/api/properties-hub/${id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string }

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to delete property")
      }

      setProperties((prev) => prev.filter((property) => property.id !== id))
      setDrafts((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setMessage("Property deleted")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete property")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-12 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <section className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Properties</h1>
            <p className="mt-1 text-sm text-[var(--foreground)]/70">
              Manage property records for flooring work orders, including full address formulas and management links.
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
            Property
          </button>
        </div>

        {message && <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
        {error && <p className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="mt-6 mb-4 flex items-center justify-between">
          <span className="text-xs text-[var(--foreground)]/60">{properties.length} total</span>
        </div>

        <div className="overflow-x-auto border-y border-[var(--panel-border)]">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="bg-[var(--panel-hover)] text-left">
              <tr>
                <th className="px-2 py-2">Open</th>
                <th className="px-3 py-2">Property</th>
                <th className="px-3 py-2">Street</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">State</th>
                <th className="px-3 py-2">Zip</th>
                <th className="px-3 py-2">Phone</th>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Full Address</th>
                <th className="px-3 py-2">Management Company</th>
                <th className="px-3 py-2">Save</th>
                <th className="px-3 py-2">Delete</th>
              </tr>
            </thead>
            <tbody>
              {properties.map((row) => {
                const draft = getDraft(row.id)

                return (
                  <tr key={row.id} className="border-t border-[var(--panel-border)] hover:bg-[var(--panel-hover)]/40">
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setSelectedProperty(row)}
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
                    <td className="px-3 py-2">{computeFullAddress({
                      streetAddress: draft.streetAddress,
                      city: draft.city,
                      state: draft.state,
                      zip: draft.zip,
                    })}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={draft.managementCompanyId}
                        onChange={(event) => setDraftField(row.id, "managementCompanyId", event.target.value)}
                        className="min-h-16 w-56 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                      >
                        <option value="">No management company</option>
                        {managementOptions.map((company) => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void saveProperty(row)}
                        disabled={isSavingId === row.id}
                        className="rounded border border-[var(--panel-border)] px-3 py-1 hover:bg-[var(--panel-hover)] disabled:opacity-60"
                      >
                        {isSavingId === row.id ? "Saving..." : "Save"}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => void deleteProperty(row.id)}
                        disabled={deletingId === row.id}
                        className="rounded border border-rose-500/40 px-3 py-1 text-rose-600 transition hover:bg-rose-500/10 disabled:opacity-60"
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {properties.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-8 text-center text-[var(--foreground)]/70">No properties yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>

      {isCreateModalOpen ? (
        <ModalShell title="New Property" onClose={() => !isSavingNew && setIsCreateModalOpen(false)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField label="Property Name">
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
              <FormField label="Management Company">
                <select value={newDraft.managementCompanyId} onChange={(event) => setNewDraftField("managementCompanyId", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2">
                  <option value="">No management company</option>
                  {managementOptions.map((company) => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Phone">
                <input value={newDraft.phone} onChange={(event) => setNewDraftField("phone", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Email">
                <input value={newDraft.email} onChange={(event) => setNewDraftField("email", event.target.value)} className="rounded border border-[var(--panel-border)] bg-transparent px-3 py-2" />
              </FormField>
              <FormField label="Full Address">
                <div className="min-h-11 rounded border border-[var(--panel-border)] bg-[var(--panel-hover)]/30 px-3 py-2 text-sm">
                  {computeFullAddress(newDraft) || "Property address preview"}
                </div>
              </FormField>
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateModalOpen(false)} disabled={isSavingNew} className="rounded border border-[var(--panel-border)] px-4 py-2 text-sm">
                Cancel
              </button>
              <button type="button" onClick={() => void createProperty()} disabled={isSavingNew} className="rounded bg-blue-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-60">
                {isSavingNew ? "Creating..." : "Create Property"}
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {selectedProperty ? (
        <ModalShell title={selectedProperty.name} onClose={() => setSelectedProperty(null)}>
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Address</p>
                <p className="mt-1 font-medium">{selectedProperty.fullAddress || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Phone</p>
                <p className="mt-1 font-medium">{selectedProperty.phone || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Email</p>
                <p className="mt-1 font-medium">{selectedProperty.email || "-"}</p>
              </div>
              <div className="rounded-lg border border-[var(--panel-border)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Management Company</p>
                <p className="mt-1 font-medium">{selectedProperty.managementCompany?.name || "None"}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold">Linked Templates</h3>
                <p className="text-sm text-[var(--foreground)]/70">Templates assigned to this property.</p>
              </div>
              <div className="overflow-x-auto rounded-lg border border-[var(--panel-border)]">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="px-3 py-2">Template Tag</th>
                      <th className="px-3 py-2">Warehouse</th>
                      <th className="px-3 py-2">Items</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProperty.templates.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-3 py-8 text-center text-[var(--foreground)]/70">No templates linked to this property.</td>
                      </tr>
                    ) : (
                      selectedProperty.templates.map((template) => (
                        <tr key={template.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-3 py-2">{template.templateTag}</td>
                          <td className="px-3 py-2">{template.warehouseName || "-"}</td>
                          <td className="px-3 py-2">{template.itemsCount}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  )
}
