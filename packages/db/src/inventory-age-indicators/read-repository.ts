import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { resolveNumberNeighbors } from "../shared/number-neighbors.js"
import {
  normalizeInventoryAgeIndicator,
  type InventoryAgeBucket,
  type InventoryAgeIndicator,
  type InventoryAgeIndicatorListRow,
} from "@builders/domain"

type InventoryAgeIndicatorsDbClient = PrismaClient | Prisma.TransactionClient

// Adjacent age-indicator ids in the global `days` ASC order — powers the
// record-view shell stepper. Both null at the sequence edges.
export type InventoryAgeIndicatorNeighbors = {
  previousInventoryAgeIndicator: { id: string } | null
  nextInventoryAgeIndicator: { id: string } | null
}

export const NO_INVENTORY_AGE_INDICATOR_NEIGHBORS: InventoryAgeIndicatorNeighbors = {
  previousInventoryAgeIndicator: null,
  nextInventoryAgeIndicator: null,
}

export type InventoryAgeIndicatorDetailRecord = InventoryAgeIndicator &
  InventoryAgeIndicatorNeighbors

export type InventoryAgeIndicatorListViewOptions = {
  skip: number
  take: number
}

export type InventoryAgeIndicatorListViewResult = {
  rows: InventoryAgeIndicatorListRow[]
  total: number
}

/**
 * Paginated read for the inventory-age-indicators list view. The order is
 * LOCKED — `days` ascending (lowest threshold at the top), `id` as the stable
 * tiebreak — with no filters or search (the list has none by design).
 */
export async function listInventoryAgeIndicatorsForListView(
  options: InventoryAgeIndicatorListViewOptions,
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<InventoryAgeIndicatorListViewResult> {
  const [total, rows] = await Promise.all([
    client.flooringInventoryAgeIndicator.count(),
    client.flooringInventoryAgeIndicator.findMany({
      orderBy: [{ days: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeInventoryAgeIndicator),
  }
}

export async function getInventoryAgeIndicatorById(
  id: string,
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<InventoryAgeIndicator> {
  const indicator = await client.flooringInventoryAgeIndicator.findUniqueOrThrow({
    where: { id },
  })
  return normalizeInventoryAgeIndicator(indicator)
}

/**
 * Resolve the age-indicator rows immediately before/after the given `days`
 * value in the global ascending order. Powers the record-view shell stepper —
 * two single-row lookups on the `days` index. `days` is a non-null unique Int,
 * so the neighbor pair walks a clean number line.
 */
async function getInventoryAgeIndicatorNeighbors(
  days: number,
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<InventoryAgeIndicatorNeighbors> {
  const { previous, next } = await resolveNumberNeighbors(
    "days",
    days,
    (q) => client.flooringInventoryAgeIndicator.findFirst({ ...q, select: { id: true } }),
  )

  return {
    previousInventoryAgeIndicator: previous ? { id: previous.id } : null,
    nextInventoryAgeIndicator: next ? { id: next.id } : null,
  }
}

export async function getInventoryAgeIndicatorDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<InventoryAgeIndicatorDetailRecord | null> {
  const row = await client.flooringInventoryAgeIndicator.findUnique({ where: { id } })
  if (!row) return null
  const neighbors =
    options.withNeighbors === false
      ? NO_INVENTORY_AGE_INDICATOR_NEIGHBORS
      : await getInventoryAgeIndicatorNeighbors(row.days, client)
  return { ...normalizeInventoryAgeIndicator(row), ...neighbors }
}

/**
 * Load the full set of age-indicator thresholds as `{ days, color }` buckets,
 * sorted ASCENDING by `days` — the shape {@link resolveInventoryAgeColor}
 * consumes. Tiny user-managed table; read once per inventory list/detail read to
 * stamp the derived date-cell chip colors.
 */
export async function listInventoryAgeBuckets(
  client: InventoryAgeIndicatorsDbClient = db,
): Promise<InventoryAgeBucket[]> {
  const rows = await client.flooringInventoryAgeIndicator.findMany({
    select: { days: true, color: true },
    orderBy: { days: "asc" },
  })
  return rows.map((row) => ({ days: row.days, color: row.color }))
}
