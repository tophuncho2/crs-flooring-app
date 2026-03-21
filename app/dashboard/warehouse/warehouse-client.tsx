"use client"

import { useCallback, useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { DASHBOARD_PAGE_SHELL_SHORT_CLASS_NAME, DashboardCardTitle } from "@/features/flooring/shared/dashboard-card-title"
import { DeleteRowButton, OpenRowButton } from "@/features/flooring/shared/row-action-buttons"
import { RecordModalShell } from "@/features/flooring/shared/record-form"
import { ModalTableHead, ModalTableShell, TableEmptyRow, TableHeaderCell, TableHead, TableShell, TableSectionMeta } from "@/features/flooring/shared/table-shell"

type WarehouseDraft = {
  name: string
  address: string
  phone: string
}

type SectionRow = {
  id: string
  name: string
  locationsCount: number
}

type LocationRow = {
  id: string
  locationCode: string
  sectionId: string
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

function sortSections(rows: SectionRow[]) {
  return [...rows].sort((left, right) => left.name.localeCompare(right.name))
}

function sortLocations(rows: LocationRow[]) {
  return [...rows].sort((left, right) => {
    const sectionCompare = (left.sectionName ?? "").localeCompare(right.sectionName ?? "")
    return sectionCompare !== 0 ? sectionCompare : left.locationCode.localeCompare(right.locationCode)
  })
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
  const [locationDrafts, setLocationDrafts] = useState<Record<string, { locationCode: string; sectionId: string }>>({})
  const [newSection, setNewSection] = useState("")
  const [newLocation, setNewLocation] = useState({ locationCode: "", sectionId: "" })
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null)

  const loadChildren = useCallback(async (warehouseId: string) => {
    try {
      const [sectionsRes, locationsRes] = await Promise.all([
        fetch(`/api/flooring/sections?warehouseId=${warehouseId}`),
        fetch(`/api/flooring/locations?warehouseId=${warehouseId}`),
      ])

      const sectionsPayload = (await sectionsRes.json().catch(() => ({}))) as {
        error?: string
        sections?: Array<{ id: string; name: string; locationsCount?: number }>
      }
      const locationsPayload = (await locationsRes.json().catch(() => ({}))) as {
        error?: string
        locations?: Array<{ id: string; locationCode: string; sectionId: string; sectionName: string | null }>
      }

      if (!sectionsRes.ok || !locationsRes.ok) {
        throw new Error(sectionsPayload.error ?? locationsPayload.error ?? "Failed to load warehouse details")
      }

      setSections(
        sortSections(
          (sectionsPayload.sections ?? []).map((section) => ({
            id: section.id,
            name: section.name,
            locationsCount: section.locationsCount ?? 0,
          })),
        ),
      )
      setLocations(sortLocations(locationsPayload.locations ?? []))
      setError("")
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load warehouse details")
    }
  }, [])

  useEffect(() => {
    if (!activeRow) return
    void loadChildren(activeRow.id)
  }, [activeRow, loadChildren])

  function getDraft(row: WarehouseRow): WarehouseDraft {
    return drafts[row.id] ?? { name: row.name, address: row.address ?? "", phone: row.phone ?? "" }
  }

  function updateDraft(id: string, field: keyof WarehouseDraft, value: string) {
    const found = rows.find((row) => row.id === id)
    if (!found) return
    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(found), [field]: value } }))
  }

  function patchActiveWarehouse(updater: (row: WarehouseRow) => WarehouseRow) {
    setActiveRow((prev) => (prev ? updater(prev) : prev))
    setRows((prev) => prev.map((row) => (activeRow && row.id === activeRow.id ? updater(row) : row)))
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

    setRows((prev) => prev.map((item) => (item.id === row.id ? payload.warehouse! : item)))
    setActiveRow((prev) => (prev?.id === row.id ? payload.warehouse! : prev))
    setMessage("Warehouse updated")
    setError("")
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

    setRows((prev) => [payload.warehouse!, ...prev])
    setCreateDraft({ name: "", address: "", phone: "" })
    setIsCreating(false)
    setMessage("Warehouse created")
    setError("")
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

    const createdSection: SectionRow = {
      id: payload.section.id,
      name: payload.section.name,
      locationsCount: payload.section.locationsCount ?? 0,
    }

    setSections((prev) => sortSections([...prev, createdSection]))
    patchActiveWarehouse((row) => ({ ...row, sectionsCount: row.sectionsCount + 1 }))
    setNewSection("")
    setMessage("Section added")
    setError("")
  }

  async function saveSection(section: SectionRow) {
    const name = (sectionDrafts[section.id] ?? section.name).trim()
    if (!name || !activeRow) return

    const response = await fetch(`/api/flooring/sections/${section.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, warehouseId: activeRow.id }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      section?: { id: string; name: string; locationsCount?: number }
    }
    if (!response.ok || !payload.section) {
      setError(payload.error ?? "Failed to update section")
      return
    }

    setSections((prev) =>
      sortSections(
        prev.map((row) =>
          row.id === section.id
            ? { ...row, name: payload.section!.name, locationsCount: payload.section!.locationsCount ?? row.locationsCount }
            : row,
        ),
      ),
    )
    setSectionDrafts((prev) => {
      const next = { ...prev }
      delete next[section.id]
      return next
    })
    setMessage("Section updated")
    setError("")
  }

  async function deleteSection(section: SectionRow) {
    if (!activeRow) return
    if (!window.confirm(`Delete section ${section.name}?`)) return

    setDeletingSectionId(section.id)
    try {
      const response = await fetch(`/api/flooring/sections/${section.id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to delete section")
      }

      setSections((prev) => prev.filter((row) => row.id !== section.id))
      setSectionDrafts((prev) => {
        const next = { ...prev }
        delete next[section.id]
        return next
      })
      patchActiveWarehouse((row) => ({ ...row, sectionsCount: Math.max(0, row.sectionsCount - 1) }))
      setMessage("Section deleted")
      setError("")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete section")
    } finally {
      setDeletingSectionId(null)
    }
  }

  async function addLocation() {
    if (!activeRow || !newLocation.locationCode.trim() || !newLocation.sectionId) return

    const response = await fetch("/api/flooring/locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouseId: activeRow.id, locationCode: newLocation.locationCode, sectionId: newLocation.sectionId }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      location?: { id: string; locationCode: string; sectionId: string; sectionName: string | null }
    }

    if (!response.ok || !payload.location) {
      setError(payload.error ?? "Failed to add location")
      return
    }

    setLocations((prev) => sortLocations([...prev, payload.location!]))
    setSections((prev) =>
      prev.map((row) => (row.id === payload.location!.sectionId ? { ...row, locationsCount: row.locationsCount + 1 } : row)),
    )
    patchActiveWarehouse((row) => ({ ...row, locationsCount: row.locationsCount + 1 }))
    setNewLocation({ locationCode: "", sectionId: "" })
    setMessage("Location added")
    setError("")
  }

  async function saveLocation(location: LocationRow) {
    const draft = locationDrafts[location.id] ?? {
      locationCode: location.locationCode,
      sectionId: location.sectionId,
    }

    if (!draft.locationCode.trim() || !draft.sectionId) return

    const response = await fetch(`/api/flooring/locations/${location.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locationCode: draft.locationCode, sectionId: draft.sectionId }),
    })

    const payload = (await response.json().catch(() => ({}))) as {
      error?: string
      location?: { id: string; locationCode: string; sectionId: string; sectionName: string | null }
    }

    if (!response.ok || !payload.location) {
      setError(payload.error ?? "Failed to update location")
      return
    }

    setLocations((prev) =>
      sortLocations(
        prev.map((row) =>
          row.id === location.id
            ? {
                ...row,
                locationCode: payload.location!.locationCode,
                sectionId: payload.location!.sectionId,
                sectionName: payload.location!.sectionName,
              }
            : row,
        ),
      ),
    )
    if (location.sectionId !== payload.location.sectionId) {
      setSections((prev) =>
        prev.map((row) => {
          if (row.id === location.sectionId) return { ...row, locationsCount: Math.max(0, row.locationsCount - 1) }
          if (row.id === payload.location!.sectionId) return { ...row, locationsCount: row.locationsCount + 1 }
          return row
        }),
      )
    }
    setLocationDrafts((prev) => {
      const next = { ...prev }
      delete next[location.id]
      return next
    })
    setMessage("Location updated")
    setError("")
  }

  async function deleteLocation(location: LocationRow) {
    if (!window.confirm(`Delete location ${location.locationCode}?`)) return

    setDeletingLocationId(location.id)
    try {
      const response = await fetch(`/api/flooring/locations/${location.id}`, { method: "DELETE" })
      const payload = (await response.json().catch(() => ({}))) as { error?: string; ok?: boolean }
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Failed to delete location")
      }

      setLocations((prev) => prev.filter((row) => row.id !== location.id))
      setLocationDrafts((prev) => {
        const next = { ...prev }
        delete next[location.id]
        return next
      })
      setSections((prev) =>
        prev.map((row) => (row.id === location.sectionId ? { ...row, locationsCount: Math.max(0, row.locationsCount - 1) } : row)),
      )
      patchActiveWarehouse((row) => ({ ...row, locationsCount: Math.max(0, row.locationsCount - 1) }))
      setMessage("Location deleted")
      setError("")
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete location")
    } finally {
      setDeletingLocationId(null)
    }
  }

  return (
    <div className={DASHBOARD_PAGE_SHELL_SHORT_CLASS_NAME}>
      <div className="rounded-xl border border-[var(--panel-border)] bg-[var(--panel-background)] p-4 sm:p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <DashboardCardTitle>Warehouse</DashboardCardTitle>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--foreground)]/60">{rows.length} total</span>
            <button
              onClick={() => setIsCreating(true)}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400"
            >
              <Plus size={16} />
              Add Warehouse
            </button>
          </div>
        </div>

        {message ? <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600">{message}</p> : null}
        {error ? <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

        <TableSectionMeta>
          <span className="text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Warehouses</span>
        </TableSectionMeta>

        <TableShell minWidthClass="min-w-full">
          <TableHead>
            <tr>
              <TableHeaderCell>Open</TableHeaderCell>
              <TableHeaderCell>Warehouse</TableHeaderCell>
              <TableHeaderCell>Address</TableHeaderCell>
              <TableHeaderCell>Store Phone</TableHeaderCell>
              <TableHeaderCell>Sections</TableHeaderCell>
              <TableHeaderCell>Locations</TableHeaderCell>
              <TableHeaderCell>Work Orders</TableHeaderCell>
            </tr>
          </TableHead>
          <tbody>
            {rows.map((row) => {
              const draft = getDraft(row)
              return (
                <tr key={row.id} className="border-t border-[var(--panel-border)] transition hover:bg-[var(--panel-hover)]">
                  <td className="px-3 py-2">
                    <OpenRowButton onClick={() => setActiveRow(row)}>Open</OpenRowButton>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={draft.name}
                      onChange={(event) => updateDraft(row.id, "name", event.target.value)}
                      onBlur={() => void saveRow(row)}
                      className="w-44 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={draft.address}
                      onChange={(event) => updateDraft(row.id, "address", event.target.value)}
                      onBlur={() => void saveRow(row)}
                      className="w-[34rem] rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={draft.phone}
                      onChange={(event) => updateDraft(row.id, "phone", event.target.value)}
                      onBlur={() => void saveRow(row)}
                      className="w-40 rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                    />
                  </td>
                  <td className="px-3 py-2">{row.sectionsCount}</td>
                  <td className="px-3 py-2">{row.locationsCount}</td>
                  <td className="px-3 py-2">{row.workOrdersCount}</td>
                </tr>
              )
            })}
          </tbody>
        </TableShell>
      </div>

      {isCreating ? (
        <RecordModalShell title="Add Warehouse" onClose={() => setIsCreating(false)} sizeClass="max-w-3xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input
                value={createDraft.name}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Warehouse"
                className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
              <input
                value={createDraft.phone}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="Store Phone"
                className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2"
              />
              <textarea
                value={createDraft.address}
                onChange={(event) => setCreateDraft((prev) => ({ ...prev, address: event.target.value }))}
                placeholder="Address"
                className="rounded-md border border-[var(--panel-border)] bg-transparent px-3 py-2 md:col-span-2"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreating(false)}
                type="button"
                className="rounded-lg border border-[var(--panel-border)] px-4 py-2 transition hover:bg-[var(--panel-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={() => void createWarehouse()}
                type="button"
                className="rounded-lg bg-blue-500 px-4 py-2 font-semibold text-black transition hover:bg-blue-400"
              >
                Create Warehouse
              </button>
            </div>
          </div>
        </RecordModalShell>
      ) : null}

      {activeRow ? (
        <RecordModalShell title={`Warehouse - ${activeRow.name}`} onClose={() => setActiveRow(null)} sizeClass="max-w-6xl">
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Warehouse</p>
                <p className="mt-1 font-medium">{activeRow.name}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Address</p>
                <p className="mt-1 font-medium">{activeRow.address || "-"}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Store Phone</p>
                <p className="mt-1 font-medium">{activeRow.phone || "-"}</p>
              </div>
              <div className="rounded-lg border border-[color:var(--subpanel-border)] bg-[var(--subpanel-background)] px-4 py-3">
                <p className="text-xs text-[var(--foreground)]/60">Counts</p>
                <p className="mt-1 font-medium">
                  {activeRow.sectionsCount} sections / {activeRow.locationsCount} locations / {activeRow.workOrdersCount} work orders
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Sections</h3>
                <div className="mb-3 flex gap-2">
                  <input
                    value={newSection}
                    onChange={(event) => setNewSection(event.target.value)}
                    placeholder="Section name"
                    className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  />
                  <button onClick={() => void addSection()} type="button" className="rounded border border-[var(--panel-border)] px-3 py-1">
                    Add
                  </button>
                </div>
                <ModalTableShell minWidthClass="min-w-full" className="max-h-80 overflow-auto">
                  <ModalTableHead>
                    <tr>
                      <TableHeaderCell>Section</TableHeaderCell>
                      <TableHeaderCell>Locations</TableHeaderCell>
                      <TableHeaderCell>Delete</TableHeaderCell>
                    </tr>
                  </ModalTableHead>
                  <tbody>
                    {sections.length === 0 ? (
                      <TableEmptyRow message="No sections yet." colSpan={3} />
                    ) : (
                      sections.map((section) => (
                        <tr key={section.id} className="border-t border-[color:var(--subpanel-border)]">
                          <td className="px-3 py-2">
                            <input
                              value={sectionDrafts[section.id] ?? section.name}
                              onChange={(event) => setSectionDrafts((prev) => ({ ...prev, [section.id]: event.target.value }))}
                              onBlur={() => void saveSection(section)}
                              className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                            />
                          </td>
                          <td className="px-3 py-2">{section.locationsCount}</td>
                          <td className="px-3 py-2">
                            <DeleteRowButton onClick={() => void deleteSection(section)} disabled={deletingSectionId === section.id}>
                              {deletingSectionId === section.id ? "Deleting..." : "Delete"}
                            </DeleteRowButton>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </ModalTableShell>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--foreground)]/70">Locations</h3>
                <div className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <input
                    value={newLocation.locationCode}
                    onChange={(event) => setNewLocation((prev) => ({ ...prev, locationCode: event.target.value }))}
                    placeholder="Location code"
                    className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1 md:col-span-2"
                  />
                  <select
                    value={newLocation.sectionId}
                    onChange={(event) => setNewLocation((prev) => ({ ...prev, sectionId: event.target.value }))}
                    className="rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                  >
                    <option value="">Select section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => void addLocation()}
                    type="button"
                    disabled={!newLocation.sectionId}
                    className="rounded border border-[var(--panel-border)] px-3 py-1 disabled:opacity-60 md:col-span-3"
                  >
                    Add Location
                  </button>
                </div>
                <ModalTableShell minWidthClass="min-w-full" className="max-h-80 overflow-auto">
                  <ModalTableHead>
                    <tr>
                      <TableHeaderCell>Location</TableHeaderCell>
                      <TableHeaderCell>Section</TableHeaderCell>
                      <TableHeaderCell>Delete</TableHeaderCell>
                    </tr>
                  </ModalTableHead>
                  <tbody>
                    {locations.length === 0 ? (
                      <TableEmptyRow message="No locations yet." colSpan={3} />
                    ) : (
                      locations.map((location) => {
                        const draft = locationDrafts[location.id] ?? {
                          locationCode: location.locationCode,
                          sectionId: location.sectionId,
                        }

                        return (
                          <tr key={location.id} className="border-t border-[color:var(--subpanel-border)]">
                            <td className="px-3 py-2">
                              <input
                                value={draft.locationCode}
                                onChange={(event) =>
                                  setLocationDrafts((prev) => ({
                                    ...prev,
                                    [location.id]: { ...draft, locationCode: event.target.value },
                                  }))
                                }
                                onBlur={() => void saveLocation(location)}
                                className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={draft.sectionId}
                                onChange={(event) =>
                                  setLocationDrafts((prev) => ({
                                    ...prev,
                                    [location.id]: { ...draft, sectionId: event.target.value },
                                  }))
                                }
                                onBlur={() => void saveLocation(location)}
                                className="w-full rounded border border-[var(--panel-border)] bg-transparent px-2 py-1"
                              >
                                <option value="">Select section</option>
                                {sections.map((section) => (
                                  <option key={section.id} value={section.id}>
                                    {section.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <DeleteRowButton onClick={() => void deleteLocation(location)} disabled={deletingLocationId === location.id}>
                                {deletingLocationId === location.id ? "Deleting..." : "Delete"}
                              </DeleteRowButton>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </ModalTableShell>
              </div>
            </div>
          </div>
        </RecordModalShell>
      ) : null}
    </div>
  )
}
