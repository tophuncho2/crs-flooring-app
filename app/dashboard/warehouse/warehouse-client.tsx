"use client"

import { type ReactNode, useEffect, useState } from "react"
import { Plus, X } from "lucide-react"

type WarehouseDraft = {
  name: string
  address: string
  phone: string
}

type SectionRow = {
  id: string
  name: string
  locationsCount?: number
}

type LocationRow = {
  id: string
  locationCode: string
  sectionName: string | null
}

export type WarehouseRow = {
  id: string
  name: string
  address: string | null
  phone: string | null
  sectionsCount: number
  locationsCount: number
  workOrdersCount: number
  createdAt: string
  updatedAt: string
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-black/50 p-4 pt-24 sm:p-6 sm:pt-28">
      <div className="flex min-h-full items-start justify-center">
        <div className="flex max-h-[calc(100vh-7rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] shadow-xl sm:max-h-[calc(100vh-8rem)]">
          <div className="flex items-center justify-between border-b border-[var(--panel-border)] px-5 py-4">
            <h2 className="text-lg font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-[var(--foreground)]/70 transition hover:bg-[var(--panel-hover)] hover:text-[var(--foreground)]"
              type="button"
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

export default function WarehouseClient({ initialRows }: { initialRows: WarehouseRow[] }) {
  const [rows, setRows] = useState(initialRows)
  const [drafts, setDrafts] = useState<Record<string, WarehouseDraft>>({})
  const [activeRow, setActiveRow] = useState<WarehouseRow | null>(null)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState<WarehouseDraft>({ name: "", address: "", phone: "" })

  const [sections, setSections] = useState<SectionRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({})
  const [locationDrafts, setLocationDrafts] = useState<Record<string, { locationCode: string; sectionName: string }>>({})
  const [newSection, setNewSection] = useState("")
  const [newLocation, setNewLocation] = useState({ locationCode: "", sectionName: "" })

  useEffect(() => {
    if (!activeRow) return
    const row = activeRow

    async function loadChildren() {
      try {
        const [sectionsRes, locationsRes] = await Promise.all([
          fetch(`/api/flooring/sections?warehouseId=${row.id}`),
          fetch(`/api/flooring/locations?warehouseId=${row.id}`),
        ])

        const sectionsPayload = (await sectionsRes.json().catch(() => ({}))) as {
          sections?: Array<{ id: string; name: string; locationsCount?: number }>
        }
        const locationsPayload = (await locationsRes.json().catch(() => ({}))) as {
          locations?: Array<{ id: string; locationCode: string; sectionName: string | null }>
        }

        setSections(sectionsPayload.sections ?? [])
        setLocations(locationsPayload.locations ?? [])
      } catch {
        setSections([])
        setLocations([])
      }
    }

    loadChildren()
  }, [activeRow])

  function getDraft(row: WarehouseRow): WarehouseDraft {
    return drafts[row.id] ?? { name: row.name, address: row.address ?? "", phone: row.phone ?? "" }
  }

  function updateDraft(id: string, field: keyof WarehouseDraft, value: string) {
    const found = rows.find((r) => r.id === id)
    if (!found) return
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(found), [field]: value } }))
  }

  async function saveRow(row: WarehouseRow) {
    const draft = getDraft(row)
    if (!draft.name.trim()) return

    const response = await fetch(`/api/flooring/warehouses/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; warehouse?: WarehouseRow }
    if (!response.ok || !payload.warehouse) {
      setError(payload.error ?? "Failed to update warehouse")
      return
    }

    setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, ...payload.warehouse } : item)))
    setMessage("Warehouse updated")
  }

  async function createWarehouse() {
    if (!createDraft.name.trim()) return

    const response = await fetch("/api/flooring/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createDraft),
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; warehouse?: WarehouseRow }
    if (!response.ok || !payload.warehouse) {
      setError(payload.error ?? "Failed to create warehouse")
      return
    }

    setRows((prev) => [payload.warehouse as WarehouseRow, ...prev])
    setCreateDraft({ name: "", address: "", phone: "" })
    setIsCreating(false)
    setMessage("Warehouse created")
  }

  async function addSection() {
    if (!activeRow || !newSection.trim()) return

    const response = await fetch("/api/flooring/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId: activeRow.id, name: newSection.trim() }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      section?: { id: string; name: string; locationsCount?: number }
    }

    if (!response.ok || !payload.section) {
      setError(payload.error ?? "Failed to add section")
      return
    }

    setSections((prev) => [...prev, payload.section as SectionRow].sort((a, b) => a.name.localeCompare(b.name)))
    setRows((prev) => prev.map((row) => (row.id === activeRow.id ? { ...row, sectionsCount: row.sectionsCount + 1 } : row)))
    setNewSection("")
  }

  async function saveSection(section: SectionRow) {
    const name = (sectionDrafts[section.id] ?? section.name).trim()
    if (!name || !activeRow) return

    const response = await fetch(`/api/flooring/sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, warehouseId: activeRow.id }),
    })

    const payload = (await response.json().catch(() => ({}))) as { error?: string; section?: { id: string; name: string } }
    if (!response.ok || !payload.section) {
      setError(payload.error ?? "Failed to update section")
      return
    }

    setSections((prev) => prev.map((row) => (row.id === section.id ? { ...row, name: payload.section!.name } : row)))
    setSectionDrafts((prev) => {
      const next = { ...prev }
      delete next[section.id]
      return next
    })
  }

  async function addLocation() {
    if (!activeRow || !newLocation.locationCode.trim()) return

    const response = await fetch("/api/flooring/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId: activeRow.id, locationCode: newLocation.locationCode, sectionName: newLocation.sectionName || null }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      location?: { id: string; locationCode: string; sectionName: string | null }
    }

    if (!response.ok || !payload.location) {
      setError(payload.error ?? "Failed to add location")
      return
    }

    setLocations((prev) => [...prev, payload.location as LocationRow].sort((a, b) => a.locationCode.localeCompare(b.locationCode)))
    setRows((prev) => prev.map((row) => (row.id === activeRow.id ? { ...row, locationsCount: row.locationsCount + 1 } : row)))
    setNewLocation({ locationCode: "", sectionName: "" })
  }

  async function saveLocation(location: LocationRow) {
    const draft =
      locationDrafts[location.id] ?? {
        locationCode: location.locationCode,
        sectionName: location.sectionName ?? "",
      }

    if (!draft.locationCode.trim()) return

    const response = await fetch(`/api/flooring/locations/${location.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationCode: draft.locationCode, sectionName: draft.sectionName || null }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      location?: { id: string; locationCode: string; sectionName: string | null }
    }

    if (!response.ok || !payload.location) {
      setError(payload.error ?? "Failed to update location")
      return
    }

    setLocations((prev) =>
      prev.map((row) => (row.id === location.id ? { ...row, locationCode: payload.location!.locationCode, sectionName: payload.location!.sectionName } : row)),
    )
    setLocationDrafts((prev) => {
      const next = { ...prev }
      delete next[location.id]
      return next
    })
  }

  return (
    <div className="min-h-screen bg-[var(--background)] px-1 pb-8 pt-20 text-[var(--foreground)] sm:px-2 sm:pt-24 lg:px-3">
      <div className="w-full space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-blue-500">Warehouse</h1>
            <p className="text-sm text-[var(--foreground)]/70">Manage warehouse records and linked operational tables.</p>
          </div>
          <button onClick={() => setIsCreating(true)} type="button" className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400">
            <Plus size={16} />
            Add Warehouse
          </button>
        </div>

        {message && <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p>}
        {error && <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p>}

        <div className="overflow-hidden rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[var(--panel-hover)] text-left">
                <tr>
                  <th className="px-3 py-2">Warehouse</th>
                  <th className="px-3 py-2">Address</th>
                  <th className="px-3 py-2">Store Phone</th>
                  <th className="px-3 py-2">Sections</th>
                  <th className="px-3 py-2">Locations</th>
                  <th className="px-3 py-2">Work Orders</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const draft = getDraft(row)
                  return (
                    <tr key={row.id} className="cursor-pointer border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]" onClick={() => setActiveRow(row)}>
                      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                        <input value={draft.name} onChange={(event) => updateDraft(row.id, "name", event.target.value)} onBlur={() => saveRow(row)} className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                        <input value={draft.address} onChange={(event) => updateDraft(row.id, "address", event.target.value)} onBlur={() => saveRow(row)} className="w-[34rem] rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2" onClick={(event) => event.stopPropagation()}>
                        <input value={draft.phone} onChange={(event) => updateDraft(row.id, "phone", event.target.value)} onBlur={() => saveRow(row)} className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                      </td>
                      <td className="px-3 py-2">{row.sectionsCount}</td>
                      <td className="px-3 py-2">{row.locationsCount}</td>
                      <td className="px-3 py-2">{row.workOrdersCount}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isCreating && (
        <ModalShell title="Add Warehouse" onClose={() => setIsCreating(false)}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input value={createDraft.name} onChange={(event) => setCreateDraft((prev) => ({ ...prev, name: event.target.value }))} placeholder="Warehouse" className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            <input value={createDraft.phone} onChange={(event) => setCreateDraft((prev) => ({ ...prev, phone: event.target.value }))} placeholder="Store Phone" className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2" />
            <textarea value={createDraft.address} onChange={(event) => setCreateDraft((prev) => ({ ...prev, address: event.target.value }))} placeholder="Address" className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2" />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setIsCreating(false)} type="button" className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]">Cancel</button>
            <button onClick={createWarehouse} type="button" className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400">Create Warehouse</button>
          </div>
        </ModalShell>
      )}

      {activeRow && (
        <ModalShell title={`Warehouse - ${activeRow.name}`} onClose={() => setActiveRow(null)}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Sections</h3>
              <div className="mb-2 flex gap-2">
                <input value={newSection} onChange={(event) => setNewSection(event.target.value)} placeholder="Section name" className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1" />
                <button onClick={addSection} type="button" className="rounded border border-[var(--panel-border)] px-3 py-1">Add</button>
              </div>
              <div className="max-h-72 overflow-auto rounded border border-[var(--panel-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="px-2 py-2">Section</th>
                      <th className="px-2 py-2">Locations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => (
                      <tr key={section.id} className="border-t border-[var(--panel-border)]">
                        <td className="px-2 py-2">
                          <input
                            value={sectionDrafts[section.id] ?? section.name}
                            onChange={(event) => setSectionDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))}
                            onBlur={() => saveSection(section)}
                            className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                          />
                        </td>
                        <td className="px-2 py-2">{section.locationsCount ?? 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Locations</h3>
              <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                <input value={newLocation.locationCode} onChange={(event) => setNewLocation((prev) => ({ ...prev, locationCode: event.target.value }))} placeholder="Location code" className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1 md:col-span-2" />
                <select value={newLocation.sectionName} onChange={(event) => setNewLocation((prev) => ({ ...prev, sectionName: event.target.value }))} className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1">
                  <option value="">No Section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.name}>{section.name}</option>
                  ))}
                </select>
                <button onClick={addLocation} type="button" className="rounded border border-[var(--panel-border)] px-3 py-1 md:col-span-3">Add Location</button>
              </div>

              <div className="max-h-72 overflow-auto rounded border border-[var(--panel-border)]">
                <table className="min-w-full text-sm">
                  <thead className="bg-[var(--panel-hover)] text-left">
                    <tr>
                      <th className="px-2 py-2">Location</th>
                      <th className="px-2 py-2">Section</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((location) => {
                      const draft = locationDrafts[location.id] ?? { locationCode: location.locationCode, sectionName: location.sectionName ?? "" }
                      return (
                        <tr key={location.id} className="border-t border-[var(--panel-border)]">
                          <td className="px-2 py-2">
                            <input
                              value={draft.locationCode}
                              onChange={(event) => setLocationDrafts((prev) => ({ ...prev, [location.id]: { ...draft, locationCode: event.target.value } }))}
                              onBlur={() => saveLocation(location)}
                              className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <select
                              value={draft.sectionName}
                              onChange={(event) => setLocationDrafts((prev) => ({ ...prev, [location.id]: { ...draft, sectionName: event.target.value } }))}
                              onBlur={() => saveLocation(location)}
                              className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            >
                              <option value="">No Section</option>
                              {sections.map((section) => (
                                <option key={section.id} value={section.name}>{section.name}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  )
}
