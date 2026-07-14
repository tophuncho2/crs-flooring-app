import type { Prisma } from "../../generated/prisma/client.js"
import { buildFlooringProductDisplayName } from "@builders/domain"
import type { StagedInventoryRow } from "@builders/domain"
import { db } from "../../client.js"
import {
  stagedInventoryRowSelect,
  type StagedInventoryDbClient,
  type StagedInventoryRowPayload,
} from "./shared.js"

export type StagedInventoryRecord = StagedInventoryRow

function toDecimalString(value: { toString(): string } | null | undefined): string {
  if (value === null || value === undefined) return ""
  return value.toString()
}

export function normalizeStagedInventoryRow(
  row: StagedInventoryRowPayload,
): StagedInventoryRecord {
  return {
    id: row.id,
    importEntryId: row.importEntryId,
    importNumber: row.importEntry.importNumber,
    productId: row.productId,
    productName: buildFlooringProductDisplayName({
      name: row.product.name,
      style: row.product.style,
      color: row.product.color,
    }),
    categoryId: row.product.category.id,
    unitId: row.unitId ?? "",
    // Unit display derives solely from the row's own unit FK join (UoM epic 2B);
    // snapshot columns fully de-referenced (2D drops them).
    unitName: row.unit?.name ?? "",
    unitAbbrev: row.unit?.abbreviation ?? "",
    coverageUnitId: row.coverageUnitId ?? "",
    coverageUnitName: row.coverageUnit?.name ?? "",
    coverageUnitAbbrev: row.coverageUnit?.abbreviation ?? "",
    coveragePerUnit: toDecimalString(row.coveragePerUnit),
    conversionFormulaId: row.conversionFormulaId ?? "",
    conversionFormulaName: row.conversionFormula?.name ?? "",
    rollPrefix: row.rollPrefix,
    rollNumber: row.rollNumber ?? "",
    dyeLot: row.dyeLot ?? "",
    // Warehouse is parent-owned — sourced from the import entry, not a stored
    // staged-row column.
    warehouseId: row.importEntry.warehouseId,
    warehouseName: row.importEntry.warehouse.name,
    location: row.location ?? "",
    startingStock: toDecimalString(row.startingStock),
    cost: toDecimalString(row.cost),
    freight: toDecimalString(row.freight),
    status: row.status,
    note: row.note ?? "",
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export async function listStagedInventoryByImport(
  importEntryId: string,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord[]> {
  const rows = await client.flooringImportStagedInventoryRow.findMany({
    where: { importEntryId },
    select: stagedInventoryRowSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  })
  return rows.map(normalizeStagedInventoryRow)
}

export async function getStagedInventoryById(
  id: string,
  client: StagedInventoryDbClient = db,
): Promise<StagedInventoryRecord | null> {
  const row = await client.flooringImportStagedInventoryRow.findUnique({
    where: { id },
    select: stagedInventoryRowSelect,
  })
  return row ? normalizeStagedInventoryRow(row) : null
}

/**
 * Worker-only read primitive for the materialize-import flow. Returns the raw
 * `StagedInventoryRowPayload` (with the full join graph) instead of the
 * normalized `StagedInventoryRecord` because the materialize use case needs the
 * raw `unitId` FK (carried forward onto the new inventory row) before the
 * normalizer flattens it to display strings.
 *
 * Filters by `status = QUEUED` so any row that drifted state (raced edit /
 * delete / retry) is silently excluded — the caller compares the returned
 * length to the requested id count and dead-letters on mismatch.
 *
 * Transaction-only — no `client = db` default. The materialize use case is
 * always inside `withDatabaseTransaction`.
 */
export async function listStagedInventoryForMaterialization(
  tx: Prisma.TransactionClient,
  input: { importEntryId: string; ids: string[] },
): Promise<StagedInventoryRowPayload[]> {
  if (input.ids.length === 0) return []
  return tx.flooringImportStagedInventoryRow.findMany({
    where: {
      id: { in: input.ids },
      importEntryId: input.importEntryId,
      status: "QUEUED",
    },
    select: stagedInventoryRowSelect,
  })
}

export type StagedInventoryStatusById = {
  id: string
  status: StagedInventoryRowPayload["status"]
}

/**
 * Worker-only classification read for the materialize-import flow. Unlike
 * `listStagedInventoryForMaterialization` this does NOT filter by status — it
 * returns the CURRENT status of every requested id so the caller can tell the
 * three drift outcomes apart:
 *   - QUEUED    → still needs materializing (the subset to process)
 *   - IMPORTED  → a prior attempt already did it (safe idempotent skip)
 *   - DRAFT     → operator pulled it back (safe skip)
 *   - absent    → the id doesn't belong to this import (a real anomaly)
 * The QUEUED-filtered read above physically can't distinguish these — an
 * IMPORTED, a DRAFT, and an absent row all simply don't come back.
 *
 * Transaction-only — the materialize use case runs inside the parent FOR UPDATE
 * lock, so these statuses can't drift between this read and materialization.
 */
export async function listStagedInventoryStatusesByIds(
  tx: Prisma.TransactionClient,
  input: { importEntryId: string; ids: string[] },
): Promise<StagedInventoryStatusById[]> {
  if (input.ids.length === 0) return []
  return tx.flooringImportStagedInventoryRow.findMany({
    where: {
      id: { in: input.ids },
      importEntryId: input.importEntryId,
    },
    select: { id: true, status: true },
  })
}
