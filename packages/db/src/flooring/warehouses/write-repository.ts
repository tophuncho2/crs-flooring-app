import type { Prisma } from "@prisma/client"
import { db } from "../../client.js"
import { lockFlooringWarehouseRow } from "../../shared/row-locks.js"
import {
  locationRowSelect,
  sectionRowSelect,
  warehouseRowSelect,
  type WarehousesDbClient,
} from "./shared.js"
import {
  normalizeLocationRow,
  normalizeSectionRow,
  normalizeWarehouseRow,
  type LocationRecord,
  type SectionRecord,
  type WarehouseRecord,
} from "./read-repository.js"

// --- Input types ---

export type CreateWarehouseInput = {
  number: number
  name: string
  address: string | null
  phone: string | null
}

export type UpdateWarehouseInput = {
  name?: string
  address?: string | null
  phone?: string | null
}

export type CreateSectionInput = {
  warehouseId: string
  number: number
}

export type CreateLocationInput = {
  warehouseId: string
  sectionId: string
  rafter: number
  level: number
}

export type UpdateLocationInput = {
  sectionId?: string
  rafter?: number
  level?: number
}

// --- Warehouse writes (single-entity) ---

export async function createWarehouse(
  input: CreateWarehouseInput,
  client: WarehousesDbClient = db,
): Promise<WarehouseRecord> {
  const row = await client.flooringWarehouse.create({
    data: {
      number: input.number,
      name: input.name,
      address: input.address,
      phone: input.phone,
    },
    select: warehouseRowSelect,
  })
  return normalizeWarehouseRow(row)
}

export async function updateWarehouse(
  id: string,
  input: UpdateWarehouseInput,
  client: WarehousesDbClient = db,
): Promise<WarehouseRecord> {
  const data: Prisma.FlooringWarehouseUpdateInput = {}
  if (input.name !== undefined) data.name = input.name
  if (input.address !== undefined) data.address = input.address
  if (input.phone !== undefined) data.phone = input.phone

  const row = await client.flooringWarehouse.update({
    where: { id },
    data,
    select: warehouseRowSelect,
  })
  return normalizeWarehouseRow(row)
}

export async function deleteWarehouseById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<void> {
  await client.flooringWarehouse.delete({ where: { id } })
}

// --- Section writes (single-entity) ---

export async function createSection(
  input: CreateSectionInput,
  client: WarehousesDbClient = db,
): Promise<SectionRecord> {
  const row = await client.flooringSection.create({
    data: {
      warehouseId: input.warehouseId,
      number: input.number,
    },
    select: sectionRowSelect,
  })
  return normalizeSectionRow(row)
}

export async function deleteSectionById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<void> {
  await client.flooringSection.delete({ where: { id } })
}

// --- Location writes (single-entity) ---

export async function createLocation(
  input: CreateLocationInput,
  client: WarehousesDbClient = db,
): Promise<LocationRecord> {
  const row = await client.flooringLocation.create({
    data: {
      warehouseId: input.warehouseId,
      sectionId: input.sectionId,
      rafter: input.rafter,
      level: input.level,
    },
    select: locationRowSelect,
  })
  return normalizeLocationRow(row)
}

export async function updateLocation(
  id: string,
  input: UpdateLocationInput,
  client: WarehousesDbClient = db,
): Promise<LocationRecord> {
  const data: Prisma.FlooringLocationUpdateInput = {}
  if (input.sectionId !== undefined) {
    data.section = { connect: { id: input.sectionId } }
  }
  if (input.rafter !== undefined) data.rafter = input.rafter
  if (input.level !== undefined) data.level = input.level

  const row = await client.flooringLocation.update({
    where: { id },
    data,
    select: locationRowSelect,
  })
  return normalizeLocationRow(row)
}

export async function deleteLocationById(
  id: string,
  client: WarehousesDbClient = db,
): Promise<void> {
  await client.flooringLocation.delete({ where: { id } })
}

// --- Diff primitive ---

/**
 * Apply a sections-with-locations diff in one transaction.
 *
 * Caller contract:
 *  - Caller opens the transaction via withDatabaseTransaction
 *  - Caller generates UUIDs for every added section and location and passes
 *    them as `id`. Caller also pre-assigns section `number` via
 *    computeNextNumber over getExistingSectionNumbers results. The domain
 *    diff payload (with tempIds only) is translated to this shape by the
 *    application layer.
 *  - Caller has validated the diff via domain predicates before calling.
 *
 * Sections are immutable after creation (no editable fields). Only added
 * and deleted sets are accepted for sections.
 *
 * Execution order:
 *  0. Lock parent warehouse row (prevents concurrent sectional saves)
 *  1. deleteMany locations in locations.deleted
 *  2. deleteMany sections in sections.deleted
 *  3. Build tempIdMap from input (pure — no DB round-trips)
 *  4. createMany sections with client-assigned IDs and numbers
 *  5. createMany locations with client-assigned IDs, resolving sectionRef via tempIdMap
 *  6. Update modified locations (per-row loop — distinct values)
 *  7. Reload post-state (parallel)
 */
export type ApplyDiffInput = {
  warehouseId: string
  sections: {
    added: Array<{ id: string; tempId: string; number: number }>
    deleted: Array<{ id: string }>
  }
  locations: {
    added: Array<{
      id: string
      tempId: string
      sectionRef: { kind: "id"; id: string } | { kind: "tempId"; tempId: string }
      rafter: number
      level: number
    }>
    modified: Array<{ id: string; sectionId?: string; rafter?: number; level?: number }>
    deleted: Array<{ id: string }>
  }
}

export type ApplyDiffResult = {
  sections: SectionRecord[]
  locations: LocationRecord[]
  tempIdMap: Record<string, string>
}

export async function applySectionsWithLocationsDiff(
  tx: Prisma.TransactionClient,
  input: ApplyDiffInput,
): Promise<ApplyDiffResult> {
  // Step 0: Lock parent warehouse row
  await lockFlooringWarehouseRow(tx, input.warehouseId)

  // Step 1: Batch delete locations
  if (input.locations.deleted.length > 0) {
    await tx.flooringLocation.deleteMany({
      where: { id: { in: input.locations.deleted.map((d) => d.id) } },
    })
  }

  // Step 2: Batch delete sections
  if (input.sections.deleted.length > 0) {
    await tx.flooringSection.deleteMany({
      where: { id: { in: input.sections.deleted.map((d) => d.id) } },
    })
  }

  // Step 3: Build tempIdMap from input (pure — no DB round-trips)
  const tempIdMap: Record<string, string> = {}
  for (const draft of input.sections.added) {
    tempIdMap[draft.tempId] = draft.id
  }

  // Step 4: Batch create sections with pre-assigned IDs and numbers
  if (input.sections.added.length > 0) {
    await tx.flooringSection.createMany({
      data: input.sections.added.map((draft) => ({
        id: draft.id,
        warehouseId: input.warehouseId,
        number: draft.number,
      })),
    })
  }

  // Step 5: Batch create locations, resolving sectionRef via tempIdMap
  if (input.locations.added.length > 0) {
    const locationData = input.locations.added.map((draft) => {
      const sectionId =
        draft.sectionRef.kind === "id"
          ? draft.sectionRef.id
          : tempIdMap[draft.sectionRef.tempId]
      if (!sectionId) {
        throw new Error(
          `applySectionsWithLocationsDiff: unresolved tempId ${
            draft.sectionRef.kind === "tempId" ? draft.sectionRef.tempId : ""
          } for location draft ${draft.tempId}`,
        )
      }
      return {
        id: draft.id,
        warehouseId: input.warehouseId,
        sectionId,
        rafter: draft.rafter,
        level: draft.level,
      }
    })
    await tx.flooringLocation.createMany({ data: locationData })
  }

  // Step 6: Update modified locations (per-row — distinct values)
  for (const modification of input.locations.modified) {
    const data: Prisma.FlooringLocationUpdateInput = {}
    if (modification.sectionId !== undefined) {
      data.section = { connect: { id: modification.sectionId } }
    }
    if (modification.rafter !== undefined) data.rafter = modification.rafter
    if (modification.level !== undefined) data.level = modification.level
    if (Object.keys(data).length === 0) continue
    await tx.flooringLocation.update({
      where: { id: modification.id },
      data,
    })
  }

  // Step 7: Reload post-state in parallel
  const [sectionRows, locationRows] = await Promise.all([
    tx.flooringSection.findMany({
      where: { warehouseId: input.warehouseId },
      select: sectionRowSelect,
      orderBy: { number: "asc" },
    }),
    tx.flooringLocation.findMany({
      where: { warehouseId: input.warehouseId },
      select: locationRowSelect,
      orderBy: [{ rafter: "asc" }, { level: "asc" }],
    }),
  ])

  return {
    sections: sectionRows.map(normalizeSectionRow),
    locations: locationRows.map(normalizeLocationRow),
    tempIdMap,
  }
}
