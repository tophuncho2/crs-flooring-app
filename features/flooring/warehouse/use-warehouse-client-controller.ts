"use client"

import { useCallback, useEffect, useState } from "react"
import { getClientErrorMessage } from "@/features/flooring/shared/client-errors"
import { requestJson } from "@/features/flooring/shared/http"
import type { LocationDraft, LocationRow, SectionRow, WarehouseDraft, WarehouseRow } from "./types"

type SectionsPayload = {
  sections?: Array<{ id: string; name: string; locationsCount?: number }>
}

type LocationsPayload = {
  locations?: Array<{ id: string; locationCode: string; sectionId: string; sectionName: string | null }>
}

type WarehousePayload = {
  warehouse?: WarehouseRow
}

type SectionPayload = {
  section?: { id: string; name: string; locationsCount?: number }
}

type LocationPayload = {
  location?: { id: string; locationCode: string; sectionId: string; sectionName: string | null }
}

type OkPayload = {
  ok?: boolean
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

export function useWarehouseClientController(initialRows: WarehouseRow[]) {
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
  const [locationDrafts, setLocationDrafts] = useState<Record<string, LocationDraft>>({})
  const [newSection, setNewSection] = useState("")
  const [newLocation, setNewLocation] = useState<LocationDraft>({ locationCode: "", sectionId: "" })
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null)

  const loadChildren = useCallback(async (warehouseId: string) => {
    try {
      const [sectionsPayload, locationsPayload] = await Promise.all([
        requestJson<SectionsPayload>(`/api/flooring/sections?warehouseId=${warehouseId}`),
        requestJson<LocationsPayload>(`/api/flooring/locations?warehouseId=${warehouseId}`),
      ])

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
      setError(getClientErrorMessage(loadError, "Failed to load warehouse details"))
    }
  }, [])

  useEffect(() => {
    if (!activeRow) {
      return
    }

    void loadChildren(activeRow.id)
  }, [activeRow, loadChildren])

  function getDraft(row: WarehouseRow): WarehouseDraft {
    return drafts[row.id] ?? { name: row.name, address: row.address ?? "", phone: row.phone ?? "" }
  }

  function getLocationDraft(location: LocationRow): LocationDraft {
    return locationDrafts[location.id] ?? { locationCode: location.locationCode, sectionId: location.sectionId }
  }

  function updateWarehouse(warehouseId: string, updater: (row: WarehouseRow) => WarehouseRow) {
    setRows((prev) => prev.map((row) => (row.id === warehouseId ? updater(row) : row)))
    setActiveRow((prev) => (prev?.id === warehouseId ? updater(prev) : prev))
  }

  function updateDraft(id: string, field: keyof WarehouseDraft, value: string) {
    const found = rows.find((row) => row.id === id)
    if (!found) {
      return
    }

    setDrafts((prev) => ({ ...prev, [id]: { ...getDraft(found), [field]: value } }))
  }

  function updateCreateDraft(field: keyof WarehouseDraft, value: string) {
    setCreateDraft((prev) => ({ ...prev, [field]: value }))
  }

  function openWarehouse(row: WarehouseRow) {
    setActiveRow(row)
  }

  function closeWarehouse() {
    setActiveRow(null)
  }

  async function saveWarehouse(row: WarehouseRow) {
    const draft = getDraft(row)
    if (!draft.name.trim()) {
      return
    }

    try {
      const payload = await requestJson<WarehousePayload>(`/api/flooring/warehouses/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      if (!payload.warehouse) {
        throw new Error("Failed to update warehouse")
      }

      updateWarehouse(row.id, () => payload.warehouse!)
      setMessage("Warehouse updated")
      setError("")
    } catch (saveError) {
      setError(getClientErrorMessage(saveError, "Failed to update warehouse"))
    }
  }

  async function createWarehouse() {
    if (!createDraft.name.trim()) {
      return
    }

    try {
      const payload = await requestJson<WarehousePayload>("/api/flooring/warehouses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createDraft),
      })

      if (!payload.warehouse) {
        throw new Error("Failed to create warehouse")
      }

      setRows((prev) => [payload.warehouse!, ...prev])
      setCreateDraft({ name: "", address: "", phone: "" })
      setIsCreating(false)
      setMessage("Warehouse created")
      setError("")
    } catch (createError) {
      setError(getClientErrorMessage(createError, "Failed to create warehouse"))
    }
  }

  async function addSection() {
    if (!activeRow || !newSection.trim()) {
      return
    }

    try {
      const payload = await requestJson<SectionPayload>("/api/flooring/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: activeRow.id, name: newSection.trim() }),
      })

      if (!payload.section) {
        throw new Error("Failed to add section")
      }

      const createdSection: SectionRow = {
        id: payload.section.id,
        name: payload.section.name,
        locationsCount: payload.section.locationsCount ?? 0,
      }

      setSections((prev) => sortSections([...prev, createdSection]))
      updateWarehouse(activeRow.id, (row) => ({ ...row, sectionsCount: row.sectionsCount + 1 }))
      setNewSection("")
      setMessage("Section added")
      setError("")
    } catch (addError) {
      setError(getClientErrorMessage(addError, "Failed to add section"))
    }
  }

  async function saveSection(section: SectionRow) {
    if (!activeRow) {
      return
    }

    const name = (sectionDrafts[section.id] ?? section.name).trim()
    if (!name) {
      return
    }

    try {
      const payload = await requestJson<SectionPayload>(`/api/flooring/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, warehouseId: activeRow.id }),
      })

      if (!payload.section) {
        throw new Error("Failed to update section")
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
    } catch (saveError) {
      setError(getClientErrorMessage(saveError, "Failed to update section"))
    }
  }

  async function deleteSection(section: SectionRow) {
    if (!activeRow) {
      return
    }

    setDeletingSectionId(section.id)
    try {
      const payload = await requestJson<OkPayload>(`/api/flooring/sections/${section.id}`, { method: "DELETE" })
      if (!payload.ok) {
        throw new Error("Failed to delete section")
      }

      setSections((prev) => prev.filter((row) => row.id !== section.id))
      setSectionDrafts((prev) => {
        const next = { ...prev }
        delete next[section.id]
        return next
      })
      updateWarehouse(activeRow.id, (row) => ({ ...row, sectionsCount: Math.max(0, row.sectionsCount - 1) }))
      setMessage("Section deleted")
      setError("")
    } catch (deleteError) {
      setError(getClientErrorMessage(deleteError, "Failed to delete section"))
    } finally {
      setDeletingSectionId(null)
    }
  }

  async function addLocation() {
    if (!activeRow || !newLocation.locationCode.trim() || !newLocation.sectionId) {
      return
    }

    try {
      const payload = await requestJson<LocationPayload>("/api/flooring/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: activeRow.id,
          locationCode: newLocation.locationCode,
          sectionId: newLocation.sectionId,
        }),
      })

      if (!payload.location) {
        throw new Error("Failed to add location")
      }

      setLocations((prev) => sortLocations([...prev, payload.location!]))
      setSections((prev) =>
        prev.map((row) => (row.id === payload.location!.sectionId ? { ...row, locationsCount: row.locationsCount + 1 } : row)),
      )
      updateWarehouse(activeRow.id, (row) => ({ ...row, locationsCount: row.locationsCount + 1 }))
      setNewLocation({ locationCode: "", sectionId: "" })
      setMessage("Location added")
      setError("")
    } catch (addError) {
      setError(getClientErrorMessage(addError, "Failed to add location"))
    }
  }

  async function saveLocation(location: LocationRow) {
    const draft = getLocationDraft(location)
    if (!draft.locationCode.trim() || !draft.sectionId) {
      return
    }

    try {
      const payload = await requestJson<LocationPayload>(`/api/flooring/locations/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: draft.locationCode, sectionId: draft.sectionId }),
      })

      if (!payload.location) {
        throw new Error("Failed to update location")
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
            if (row.id === location.sectionId) {
              return { ...row, locationsCount: Math.max(0, row.locationsCount - 1) }
            }

            if (row.id === payload.location!.sectionId) {
              return { ...row, locationsCount: row.locationsCount + 1 }
            }

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
    } catch (saveError) {
      setError(getClientErrorMessage(saveError, "Failed to update location"))
    }
  }

  async function deleteLocation(location: LocationRow) {
    if (!activeRow) {
      return
    }

    setDeletingLocationId(location.id)
    try {
      const payload = await requestJson<OkPayload>(`/api/flooring/locations/${location.id}`, { method: "DELETE" })
      if (!payload.ok) {
        throw new Error("Failed to delete location")
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
      updateWarehouse(activeRow.id, (row) => ({ ...row, locationsCount: Math.max(0, row.locationsCount - 1) }))
      setMessage("Location deleted")
      setError("")
    } catch (deleteError) {
      setError(getClientErrorMessage(deleteError, "Failed to delete location"))
    } finally {
      setDeletingLocationId(null)
    }
  }

  return {
    rows,
    drafts,
    activeRow,
    message,
    error,
    isCreating,
    createDraft,
    sections,
    locations,
    sectionDrafts,
    locationDrafts,
    newSection,
    newLocation,
    deletingSectionId,
    deletingLocationId,
    getDraft,
    getLocationDraft,
    updateDraft,
    updateCreateDraft,
    openWarehouse,
    closeWarehouse,
    setIsCreating,
    createWarehouse,
    saveWarehouse,
    setSectionDrafts,
    setLocationDrafts,
    setNewSection,
    setNewLocation,
    addSection,
    saveSection,
    deleteSection,
    saveLocation,
    addLocation,
    deleteLocation,
  }
}
