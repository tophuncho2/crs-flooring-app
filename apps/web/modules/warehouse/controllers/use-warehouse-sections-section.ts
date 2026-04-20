"use client"

import {
  createLocalRecordRowId,
  createRecordSectionError,
  isLocalOnlyRecordRow,
  useRecordScopedSectionController,
} from "@/modules/shared/engines/record-view"
import type {
  LocationRecord,
  SectionRecord,
  WarehouseDetailRecord,
} from "@builders/db"
import type {
  LocationUpdate,
  SectionsWithLocationsDiff,
} from "@builders/domain"
import { updateSectionsWithLocationsRequest } from "@/modules/warehouse/data/mutations"

export type SectionLocal = {
  id: string
  number: number | null
  updatedAt: string | null
}

export type LocationLocal = {
  id: string
  sectionId: string
  rafter: number
  level: number
  updatedAt: string | null
}

type WarehouseSectionsLocalState = {
  sections: SectionLocal[]
  locations: LocationLocal[]
}

function toSectionLocal(section: SectionRecord): SectionLocal {
  return { id: section.id, number: section.number, updatedAt: section.updatedAt }
}

function toLocationLocal(location: LocationRecord): LocationLocal {
  return {
    id: location.id,
    sectionId: location.sectionId,
    rafter: location.rafter,
    level: location.level,
    updatedAt: location.updatedAt,
  }
}

function createLocalState(record: WarehouseDetailRecord): WarehouseSectionsLocalState {
  return {
    sections: record.sections.map(toSectionLocal),
    locations: record.locations.map(toLocationLocal),
  }
}

function createSectionsRevisionKey(record: WarehouseDetailRecord) {
  return JSON.stringify({
    sections: record.sections.map((s) => `${s.id}:${s.updatedAt}:${s.number}`),
    locations: record.locations.map((l) => `${l.id}:${l.updatedAt}:${l.sectionId}:${l.rafter}:${l.level}`),
  })
}

function buildDiff(
  local: WarehouseSectionsLocalState,
  server: { sections: SectionRecord[]; locations: LocationRecord[] },
): SectionsWithLocationsDiff {
  const serverSectionsById = new Map(server.sections.map((s) => [s.id, s]))
  const serverLocationsById = new Map(server.locations.map((l) => [l.id, l]))

  const localSectionIds = new Set(local.sections.map((s) => s.id))
  const localLocationIds = new Set(local.locations.map((l) => l.id))

  const sectionsAdded = local.sections
    .filter((s) => isLocalOnlyRecordRow(s.id))
    .map((s) => ({ tempId: s.id }))

  const sectionsDeleted = server.sections
    .filter((s) => !localSectionIds.has(s.id))
    .map((s) => ({ id: s.id, expectedUpdatedAt: s.updatedAt }))

  const locationsAdded = local.locations
    .filter((l) => isLocalOnlyRecordRow(l.id))
    .map((l) => ({
      tempId: l.id,
      sectionRef: isLocalOnlyRecordRow(l.sectionId)
        ? ({ kind: "tempId" as const, tempId: l.sectionId })
        : ({ kind: "id" as const, id: l.sectionId }),
      rafter: l.rafter,
      level: l.level,
    }))

  const locationsModified: LocationUpdate[] = []
  for (const l of local.locations) {
    if (isLocalOnlyRecordRow(l.id)) continue
    const server = serverLocationsById.get(l.id)
    if (!server || !l.updatedAt) continue
    const update: LocationUpdate = { id: l.id, expectedUpdatedAt: l.updatedAt }
    let changed = false
    if (l.sectionId !== server.sectionId) {
      if (isLocalOnlyRecordRow(l.sectionId)) {
        throw createRecordSectionError({
          kind: "validation",
          message: "Cannot reassign an existing location into a brand-new section. Save sections first, then move locations.",
          retryable: true,
        })
      }
      update.sectionId = l.sectionId
      changed = true
    }
    if (l.rafter !== server.rafter) {
      update.rafter = l.rafter
      changed = true
    }
    if (l.level !== server.level) {
      update.level = l.level
      changed = true
    }
    if (changed) locationsModified.push(update)
  }

  const locationsDeleted = server.locations
    .filter((l) => !localLocationIds.has(l.id))
    .map((l) => ({ id: l.id, expectedUpdatedAt: l.updatedAt }))

  // Surface sections referenced by server that also have sections referenced locally
  // ensures we don't miss anything — but server already filters missing ones.
  // Suppress unused warning:
  void serverSectionsById

  return {
    sections: { added: sectionsAdded, deleted: sectionsDeleted },
    locations: { added: locationsAdded, modified: locationsModified, deleted: locationsDeleted },
  }
}

export function useWarehouseSectionsSection({
  record,
  publishRecord,
}: {
  record: WarehouseDetailRecord
  publishRecord: (record: WarehouseDetailRecord) => void
}) {
  const section = useRecordScopedSectionController<WarehouseDetailRecord, WarehouseSectionsLocalState>({
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
      const normalized: WarehouseSectionsLocalState = {
        sections: localValue.sections,
        locations: localValue.locations.map((l) => ({
          ...l,
          rafter: Number.isFinite(l.rafter) ? Math.trunc(l.rafter) : 0,
          level: Number.isFinite(l.level) ? Math.trunc(l.level) : 0,
        })),
      }

      for (const loc of normalized.locations) {
        if (!loc.sectionId) {
          throw createRecordSectionError({
            kind: "validation",
            message: "Every location must be assigned to a section.",
            retryable: true,
          })
        }
      }

      const diff = buildDiff(normalized, {
        sections: currentRecord.sections,
        locations: currentRecord.locations,
      })

      const { warehouse, tempIdMap } = await updateSectionsWithLocationsRequest(
        currentRecord.id,
        diff,
        currentRecord.updatedAt,
      )

      // Consume tempIdMap only for visibility; local state is rebuilt from the canonical warehouse detail below.
      void tempIdMap

      publishRecord(warehouse)

      return {
        serverValue: warehouse,
        serverRevisionKey: createSectionsRevisionKey(warehouse),
        noticeMessage: "Sections saved",
      }
    },
  })

  function addSection() {
    section.setLocalValue((previous) => ({
      ...previous,
      sections: [
        { id: createLocalRecordRowId("warehouse-section"), number: null, updatedAt: null },
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

  function addLocation(sectionId: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      locations: [
        ...previous.locations,
        {
          id: createLocalRecordRowId("warehouse-location"),
          sectionId,
          rafter: 0,
          level: 0,
          updatedAt: null,
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

  function setLocationRafter(locationId: string, value: number) {
    section.setLocalValue((previous) => ({
      ...previous,
      locations: previous.locations.map((row) =>
        row.id === locationId ? { ...row, rafter: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  function setLocationLevel(locationId: string, value: number) {
    section.setLocalValue((previous) => ({
      ...previous,
      locations: previous.locations.map((row) =>
        row.id === locationId ? { ...row, level: value } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  function setLocationSection(locationId: string, sectionId: string) {
    section.setLocalValue((previous) => ({
      ...previous,
      locations: previous.locations.map((row) =>
        row.id === locationId ? { ...row, sectionId } : row,
      ),
    }))
    if (section.error) section.setError(null)
  }

  return {
    ...section,
    sections: section.localValue.sections,
    locations: section.localValue.locations,
    addSection,
    removeSection,
    addLocation,
    removeLocation,
    setLocationRafter,
    setLocationLevel,
    setLocationSection,
  }
}
