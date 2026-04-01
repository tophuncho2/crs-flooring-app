"use client"

import { requestJson } from "@/modules/shared/engines/common/transport/http"
import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import {
  createWarehouseDetail,
  toWarehouseLocationDrafts,
  toWarehouseSectionDrafts,
  type WarehouseDetail,
  type WarehouseLocationDraft,
  type WarehouseSectionDraft,
} from "../../../types"

type WarehouseSectionsLocalState = {
  sections: WarehouseSectionDraft[]
  locations: WarehouseLocationDraft[]
}

function createSectionsRevisionKey(record: WarehouseDetail) {
  return JSON.stringify({
    sections: record.sections.map((section) => ({
      id: section.id,
      name: section.name,
      locationsCount: section.locationsCount,
    })),
    locations: record.locations.map((location) => ({
      id: location.id,
      locationCode: location.locationCode,
      sectionId: location.sectionId,
      sectionName: location.sectionName,
    })),
  })
}

function createLocalState(record: WarehouseDetail): WarehouseSectionsLocalState {
  return {
    sections: toWarehouseSectionDrafts(record),
    locations: toWarehouseLocationDrafts(record),
  }
}

function recomputeSections(
  sections: WarehouseSectionDraft[],
  locations: WarehouseLocationDraft[],
) {
  return sections.map((section) => ({
    ...section,
    locationsCount: locations.filter((location) => location.sectionId === section.id).length,
  }))
}

export function useWarehouseSectionsSection({
  record,
  publishRecord,
}: {
  record: WarehouseDetail
  publishRecord: (record: WarehouseDetail) => void
}) {
  const section = useRecordScopedSectionController<WarehouseDetail, WarehouseSectionsLocalState>({
    recordId: record.id,
    sectionKey: "sections",
    serverValue: record,
    serverRevisionKey: createSectionsRevisionKey(record),
    createLocalValue: createLocalState,
    persistDraft: false,
    policy: {
      addRowPlacement: "top",
      childRows: "inline",
    },
    onSave: async (localValue, currentRecord) => {
      const normalizedSections = localValue.sections.map((row) => ({
        ...row,
        name: row.name.trim(),
      }))
      const normalizedLocations = localValue.locations.map((row) => ({
        ...row,
        locationCode: row.locationCode.trim(),
      }))

      if (normalizedSections.some((row) => !row.name)) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Every section row requires a name.",
          retryable: true,
        })
      }

      const duplicateSection = normalizedSections.find(
        (row, index) =>
          normalizedSections.findIndex(
            (candidate) => candidate.name.toLowerCase() === row.name.toLowerCase(),
          ) !== index,
      )
      if (duplicateSection) {
        throw createRecordSectionError({
          kind: "validation",
          message: `Section names must be unique. Duplicate: ${duplicateSection.name}`,
          retryable: true,
        })
      }

      if (normalizedLocations.some((row) => !row.locationCode || !row.sectionId)) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Every location row requires a location code and section.",
          retryable: true,
        })
      }

      const duplicateLocation = normalizedLocations.find(
        (row, index) =>
          normalizedLocations.findIndex(
            (candidate) =>
              candidate.locationCode.toLowerCase() === row.locationCode.toLowerCase() &&
              candidate.sectionId === row.sectionId,
          ) !== index,
      )
      if (duplicateLocation) {
        throw createRecordSectionError({
          kind: "validation",
          message: `Location codes must be unique per section. Duplicate: ${duplicateLocation.locationCode}`,
          retryable: true,
        })
      }

      const serverSections = currentRecord.sections
      const serverLocations = currentRecord.locations
      const resolvedSections = new Map<string, WarehouseSectionDraft>()

      for (const row of normalizedSections) {
        if (isLocalOnlyRecordRow(row.id)) {
          const payload = await requestJson<{ section: { id: string; name: string; locationsCount: number } }>("/api/sections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              warehouseId: currentRecord.id,
              name: row.name,
            }),
          })
          resolvedSections.set(row.id, payload.section)
          continue
        }

        const currentServerRow = serverSections.find((serverRow) => serverRow.id === row.id)
        if (!currentServerRow) {
          continue
        }

        if (currentServerRow.name === row.name) {
          resolvedSections.set(row.id, {
            id: currentServerRow.id,
            name: currentServerRow.name,
            locationsCount: currentServerRow.locationsCount,
          })
          continue
        }

        const payload = await requestJson<{ section: { id: string; name: string; locationsCount: number } }>(`/api/sections/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            warehouseId: currentRecord.id,
            name: row.name,
          }),
        })
        resolvedSections.set(row.id, payload.section)
      }

      const resolveSectionId = (sectionId: string) => resolvedSections.get(sectionId)?.id ?? sectionId
      const resolveSectionName = (sectionId: string) => {
        const resolved = resolvedSections.get(sectionId)
        if (resolved) {
          return resolved.name
        }

        return serverSections.find((sectionRow) => sectionRow.id === sectionId)?.name ?? null
      }

      const normalizedResolvedLocations = normalizedLocations.map((row) => ({
        ...row,
        sectionId: resolveSectionId(row.sectionId),
        sectionName: resolveSectionName(row.sectionId),
      }))

      const keptLocationIds = new Set(
        normalizedResolvedLocations
          .filter((row) => !isLocalOnlyRecordRow(row.id))
          .map((row) => row.id),
      )

      for (const serverRow of serverLocations) {
        if (keptLocationIds.has(serverRow.id)) {
          continue
        }

        await requestJson<{ ok: true }>(`/api/locations/${serverRow.id}`, {
          method: "DELETE",
        })
      }

      const resolvedLocations = new Map<string, WarehouseLocationDraft>()

      for (const row of normalizedResolvedLocations) {
        if (isLocalOnlyRecordRow(row.id)) {
          const payload = await requestJson<{ location: { id: string; locationCode: string; sectionId: string; sectionName: string | null } }>("/api/locations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              warehouseId: currentRecord.id,
              locationCode: row.locationCode,
              sectionId: row.sectionId,
            }),
          })
          resolvedLocations.set(row.id, payload.location)
          continue
        }

        const currentServerRow = serverLocations.find((serverRow) => serverRow.id === row.id)
        if (!currentServerRow) {
          continue
        }

        if (
          currentServerRow.locationCode === row.locationCode &&
          currentServerRow.sectionId === row.sectionId
        ) {
          resolvedLocations.set(row.id, {
            id: currentServerRow.id,
            locationCode: currentServerRow.locationCode,
            sectionId: currentServerRow.sectionId,
            sectionName: row.sectionName,
          })
          continue
        }

        const payload = await requestJson<{ location: { id: string; locationCode: string; sectionId: string; sectionName: string | null } }>(`/api/locations/${row.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationCode: row.locationCode,
            sectionId: row.sectionId,
          }),
        })
        resolvedLocations.set(row.id, payload.location)
      }

      const keptSectionIds = new Set(
        normalizedSections
          .filter((row) => !isLocalOnlyRecordRow(row.id))
          .map((row) => row.id),
      )

      for (const serverRow of serverSections) {
        if (keptSectionIds.has(serverRow.id)) {
          continue
        }

        await requestJson<{ ok: true }>(`/api/sections/${serverRow.id}`, {
          method: "DELETE",
        })
      }

      const nextSections = recomputeSections(
        normalizedSections.map((row) => {
          const resolved = resolvedSections.get(row.id)
          return resolved
            ? {
                id: resolved.id,
                name: resolved.name,
                locationsCount: resolved.locationsCount,
              }
            : row
        }),
        normalizedResolvedLocations.map((row) => resolvedLocations.get(row.id) ?? row),
      )

      const nextLocations = normalizedResolvedLocations.map((row) => {
        const resolved = resolvedLocations.get(row.id)
        if (resolved) {
          return resolved
        }

        return {
          ...row,
          sectionName: nextSections.find((sectionRow) => sectionRow.id === row.sectionId)?.name ?? row.sectionName,
        }
      })

      const nextRecord = createWarehouseDetail(
        {
          ...currentRecord,
          sectionsCount: nextSections.length,
          locationsCount: nextLocations.length,
        },
        nextSections,
        nextLocations,
      )

      publishRecord(nextRecord)

      return {
        serverValue: nextRecord,
        serverRevisionKey: createSectionsRevisionKey(nextRecord),
        noticeMessage: "Sections saved",
      }
    },
  })

  function addSection() {
    section.setLocalValue((previous) => ({
      ...previous,
      sections: [
        {
          id: createLocalRecordRowId("warehouse-section"),
          name: "",
          locationsCount: 0,
        },
        ...previous.sections,
      ],
    }))
    section.setError(null)
  }

  function removeSection(sectionId: string) {
    section.setLocalValue((previous) => ({
      sections: previous.sections.filter((row) => row.id !== sectionId),
      locations: previous.locations.filter((row) => row.sectionId !== sectionId),
    }))
    section.setError(null)
  }

  function setSectionName(sectionId: string, value: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      sections: previous.sections.map((row) =>
        row.id === sectionId
          ? {
              ...row,
              name: value,
            }
          : row,
      ),
    }))
    if (section.error) {
      section.setError(null)
    }
  }

  function addLocation(sectionId: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      locations: [
        ...previous.locations,
        {
          id: createLocalRecordRowId("warehouse-location"),
          locationCode: "",
          sectionId,
          sectionName: previous.sections.find((row) => row.id === sectionId)?.name ?? null,
        },
      ],
    }))
    section.setError(null)
  }

  function removeLocation(locationId: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      locations: previous.locations.filter((row) => row.id !== locationId),
    }))
    section.setError(null)
  }

  function setLocationCode(locationId: string, value: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      locations: previous.locations.map((row) =>
        row.id === locationId
          ? {
              ...row,
              locationCode: value,
            }
          : row,
      ),
    }))
    if (section.error) {
      section.setError(null)
    }
  }

  const rows = recomputeSections(section.localValue.sections, section.localValue.locations)

  return {
    ...section,
    rows,
    locations: section.localValue.locations,
    addSection,
    removeSection,
    setSectionName,
    addLocation,
    removeLocation,
    setLocationCode,
  }
}
