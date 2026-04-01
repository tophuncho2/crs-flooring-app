"use client"

import { useMemo, useState } from "react"
import { getClientErrorMessage } from "@/modules/shared/engines/common/transport/client-errors"
import { requestJson } from "@/modules/shared/engines/common/transport/http"
import type { LocationDraft, LocationRow, SectionRow, WarehouseDraft, WarehouseRow } from "./types"

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

function createWarehouseDraft(warehouse: WarehouseRow): WarehouseDraft {
  return {
    name: warehouse.name,
    address: warehouse.address ?? "",
    phone: warehouse.phone ?? "",
  }
}

export function useWarehouseRecordController({
  initialWarehouse,
  initialSections,
  initialLocations,
}: {
  initialWarehouse: WarehouseRow
  initialSections: SectionRow[]
  initialLocations: LocationRow[]
}) {
  const [warehouse, setWarehouse] = useState(initialWarehouse)
  const [draft, setDraft] = useState<WarehouseDraft>(() => createWarehouseDraft(initialWarehouse))
  const [sections, setSections] = useState<SectionRow[]>(() => sortSections(initialSections))
  const [locations, setLocations] = useState<LocationRow[]>(() => sortLocations(initialLocations))
  const [sectionDrafts, setSectionDrafts] = useState<Record<string, string>>({})
  const [locationDrafts, setLocationDrafts] = useState<Record<string, LocationDraft>>({})
  const [newSection, setNewSection] = useState("")
  const [newLocation, setNewLocation] = useState<LocationDraft>({ locationCode: "", sectionId: "" })
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false)
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null)
  const [deletingLocationId, setDeletingLocationId] = useState<string | null>(null)

  const isDirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(createWarehouseDraft(warehouse)),
    [draft, warehouse],
  )

  function updateDraft(field: keyof WarehouseDraft, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }))
  }

  function getLocationDraft(location: LocationRow): LocationDraft {
    return locationDrafts[location.id] ?? { locationCode: location.locationCode, sectionId: location.sectionId }
  }

  async function saveWarehouse() {
    if (!draft.name.trim()) {
      setError("Warehouse name is required")
      return
    }

    setMessage("")
    setError("")
    setIsSavingWarehouse(true)

    try {
      const payload = await requestJson<WarehousePayload>(`/api/warehouses/${warehouse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      })

      if (!payload.warehouse) {
        throw new Error("Failed to update warehouse")
      }

      setWarehouse(payload.warehouse)
      setDraft(createWarehouseDraft(payload.warehouse))
      setMessage("Warehouse saved")
    } catch (saveError) {
      setError(getClientErrorMessage(saveError, "Failed to update warehouse"))
    } finally {
      setIsSavingWarehouse(false)
    }
  }

  async function addSection() {
    if (!newSection.trim()) {
      return
    }

    try {
      const payload = await requestJson<SectionPayload>("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ warehouseId: warehouse.id, name: newSection.trim() }),
      })

      if (!payload.section) {
        throw new Error("Failed to add section")
      }

      const createdSection: SectionRow = {
        id: payload.section.id,
        name: payload.section.name,
        locationsCount: payload.section.locationsCount ?? 0,
      }

      setSections((prev) =>
        sortSections([
          ...prev,
          createdSection,
        ]),
      )
      setWarehouse((prev) => ({ ...prev, sectionsCount: prev.sectionsCount + 1 }))
      setNewSection("")
      setMessage("Section added")
      setError("")
    } catch (addError) {
      setError(getClientErrorMessage(addError, "Failed to add section"))
    }
  }

  async function saveSection(section: SectionRow) {
    const name = (sectionDrafts[section.id] ?? section.name).trim()
    if (!name) {
      return
    }

    try {
      const payload = await requestJson<SectionPayload>(`/api/sections/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, warehouseId: warehouse.id }),
      })

      if (!payload.section) {
        throw new Error("Failed to update section")
      }

      const updatedSection = payload.section

      setSections((prev) =>
        sortSections(
          prev.map((row) =>
            row.id === section.id
              ? { ...row, name: updatedSection.name, locationsCount: updatedSection.locationsCount ?? row.locationsCount }
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
    setDeletingSectionId(section.id)
    try {
      const payload = await requestJson<OkPayload>(`/api/sections/${section.id}`, { method: "DELETE" })
      if (!payload.ok) {
        throw new Error("Failed to delete section")
      }

      setSections((prev) => prev.filter((row) => row.id !== section.id))
      setSectionDrafts((prev) => {
        const next = { ...prev }
        delete next[section.id]
        return next
      })
      setWarehouse((prev) => ({ ...prev, sectionsCount: Math.max(0, prev.sectionsCount - 1) }))
      setMessage("Section deleted")
      setError("")
    } catch (deleteError) {
      setError(getClientErrorMessage(deleteError, "Failed to delete section"))
    } finally {
      setDeletingSectionId(null)
    }
  }

  async function addLocation() {
    if (!newLocation.locationCode.trim() || !newLocation.sectionId) {
      return
    }

    try {
      const payload = await requestJson<LocationPayload>("/api/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouseId: warehouse.id,
          locationCode: newLocation.locationCode,
          sectionId: newLocation.sectionId,
        }),
      })

      if (!payload.location) {
        throw new Error("Failed to add location")
      }

      const createdLocation = payload.location

      setLocations((prev) => sortLocations([...prev, createdLocation]))
      setSections((prev) =>
        prev.map((row) => (row.id === createdLocation.sectionId ? { ...row, locationsCount: row.locationsCount + 1 } : row)),
      )
      setWarehouse((prev) => ({ ...prev, locationsCount: prev.locationsCount + 1 }))
      setNewLocation({ locationCode: "", sectionId: "" })
      setMessage("Location added")
      setError("")
    } catch (addError) {
      setError(getClientErrorMessage(addError, "Failed to add location"))
    }
  }

  async function saveLocation(location: LocationRow) {
    const currentDraft = getLocationDraft(location)
    if (!currentDraft.locationCode.trim() || !currentDraft.sectionId) {
      return
    }

    try {
      const payload = await requestJson<LocationPayload>(`/api/locations/${location.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationCode: currentDraft.locationCode, sectionId: currentDraft.sectionId }),
      })

      if (!payload.location) {
        throw new Error("Failed to update location")
      }

      const updatedLocation = payload.location

      setLocations((prev) =>
        sortLocations(
          prev.map((row) =>
            row.id === location.id
              ? {
                  ...row,
                  locationCode: updatedLocation.locationCode,
                  sectionId: updatedLocation.sectionId,
                  sectionName: updatedLocation.sectionName,
                }
              : row,
          ),
        ),
      )

      if (location.sectionId !== updatedLocation.sectionId) {
        setSections((prev) =>
          prev.map((row) => {
            if (row.id === location.sectionId) {
              return { ...row, locationsCount: Math.max(0, row.locationsCount - 1) }
            }

            if (row.id === updatedLocation.sectionId) {
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
    setDeletingLocationId(location.id)
    try {
      const payload = await requestJson<OkPayload>(`/api/locations/${location.id}`, { method: "DELETE" })
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
      setWarehouse((prev) => ({ ...prev, locationsCount: Math.max(0, prev.locationsCount - 1) }))
      setMessage("Location deleted")
      setError("")
    } catch (deleteError) {
      setError(getClientErrorMessage(deleteError, "Failed to delete location"))
    } finally {
      setDeletingLocationId(null)
    }
  }

  return {
    warehouse,
    draft,
    sections,
    locations,
    sectionDrafts,
    locationDrafts,
    newSection,
    newLocation,
    message,
    error,
    isDirty,
    isSavingWarehouse,
    deletingSectionId,
    deletingLocationId,
    updateDraft,
    setSectionDrafts,
    setLocationDrafts,
    setNewSection,
    setNewLocation,
    saveWarehouse,
    addSection,
    saveSection,
    deleteSection,
    addLocation,
    saveLocation,
    deleteLocation,
    getLocationDraft,
  }
}
