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
  slug: string
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
  slug: string
  name: string
}

export type UpdateSectionInput = {
  name?: string
}

export type CreateLocationInput = {
  warehouseId: string
  sectionId: string
  locationCode: string
}

export type UpdateLocationInput = {
  sectionId?: string
  locationCode?: string
}

// --- Warehouse writes (single-entity) ---

export async function createWarehouse(
  input: CreateWarehouseInput,
  client: WarehousesDbClient = db,
): Promise<WarehouseRecord> {
  const row = await client.flooringWarehouse.create({
    data: {
      slug: input.slug,
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
      slug: input.slug,
      name: input.name,
    },
    select: sectionRowSelect,
  })
  return normalizeSectionRow(row)
}

export async function updateSection(
  id: string,
  input: UpdateSectionInput,
  client: WarehousesDbClient = db,
): Promise<SectionRecord> {
  const data: Prisma.FlooringSectionUpdateInput = {}
  if (input.name !== undefined) data.name = input.name

  const row = await client.flooringSection.update({
    where: { id },
    data,
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
      locationCode: input.locationCode,
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
  if (input.locationCode !== undefined) data.locationCode = input.locationCode

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
 *    them as `id`. The domain diff payload (with tempIds only) is translated
 *    to this shape by the application layer.
 *  - Caller has validated the diff via domain predicates before calling
 *
 * Execution order:
 *  0. Lock parent warehouse row (prevents concurrent sectional saves)
 *  1. deleteMany locations in locations.deleted
 *  2. deleteMany sections in sections.deleted
 *  3. Build tempIdMap from input (pure — no DB round-trips)
 *  4. createMany sections with client-assigned IDs
 *  5. Update modified sections (per-row loop — distinct names)
 *  6. createMany locations with client-assigned IDs, resolving sectionRef via tempIdMap
 *  7. Update modified locations (per-row loop — distinct values)
 *  8. Reload post-state (parallel)
 *
 * Returns the new canonical sections + locations arrays and the tempIdMap
 * (built from input, for the caller's convenience when mapping response
 * IDs back to optimistic UI rows).
 */
export type ApplyDiffInput = {
  warehouseId: string
  sections: {
    added: Array<{ id: string; tempId: string; slug: string; name: string }>
    modified: Array<{ id: string; name: string }>
    deleted: Array<{ id: string }>
  }
  locations: {
    added: Array<{
      id: string
      tempId: string
      sectionRef: { kind: "id"; id: string } | { kind: "tempId"; tempId: string }
      locationCode: string
    }>
    modified: Array<{ id: string; sectionId?: string; locationCode?: string }>
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

  // Step 4: Batch create sections with pre-assigned IDs
  if (input.sections.added.length > 0) {
    await tx.flooringSection.createMany({
      data: input.sections.added.map((draft) => ({
        id: draft.id,
        warehouseId: input.warehouseId,
        slug: draft.slug,
        name: draft.name,
      })),
    })
  }

  // Step 5: Update modified sections (per-row — distinct names)
  for (const modification of input.sections.modified) {
    await tx.flooringSection.update({
      where: { id: modification.id },
      data: { name: modification.name },
    })
  }

  // Step 6: Batch create locations, resolving sectionRef via tempIdMap
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
        locationCode: draft.locationCode,
      }
    })
    await tx.flooringLocation.createMany({ data: locationData })
  }

  // Step 7: Update modified locations (per-row — distinct values)
  for (const modification of input.locations.modified) {
    const data: Prisma.FlooringLocationUpdateInput = {}
    if (modification.sectionId !== undefined) {
      data.section = { connect: { id: modification.sectionId } }
    }
    if (modification.locationCode !== undefined) {
      data.locationCode = modification.locationCode
    }
    if (Object.keys(data).length === 0) continue
    await tx.flooringLocation.update({
      where: { id: modification.id },
      data,
    })
  }

  // Step 8: Reload post-state in parallel
  const [sectionRows, locationRows] = await Promise.all([
    tx.flooringSection.findMany({
      where: { warehouseId: input.warehouseId },
      select: sectionRowSelect,
      orderBy: { name: "asc" },
    }),
    tx.flooringLocation.findMany({
      where: { warehouseId: input.warehouseId },
      select: locationRowSelect,
      orderBy: { locationCode: "asc" },
    }),
  ])

  return {
    sections: sectionRows.map(normalizeSectionRow),
    locations: locationRows.map(normalizeLocationRow),
    tempIdMap,
  }
}
