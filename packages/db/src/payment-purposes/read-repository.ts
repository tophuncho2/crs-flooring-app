import { db } from "../client.js"
import type { Prisma, PrismaClient } from "../generated/prisma/client.js"
import { numberNeighborQueries } from "../shared/number-neighbors.js"
import {
  normalizePaymentPurpose,
  normalizePaymentPurposeOption,
  type PaymentPurpose,
  type PaymentPurposeListRow,
  type PaymentPurposeOption,
} from "@builders/domain"

type PaymentPurposesDbClient = PrismaClient | Prisma.TransactionClient

// Adjacent payment-purpose ids in the global ROW-number order — powers the
// record-view shell stepper. Both null at the sequence edges (or when the row
// carries no generated int yet).
export type PaymentPurposeNeighbors = {
  previousPaymentPurpose: { id: string } | null
  nextPaymentPurpose: { id: string } | null
}

export const NO_PAYMENT_PURPOSE_NEIGHBORS: PaymentPurposeNeighbors = {
  previousPaymentPurpose: null,
  nextPaymentPurpose: null,
}

export type PaymentPurposeDetailRecord = PaymentPurpose & PaymentPurposeNeighbors

export type PaymentPurposeListViewOptions = {
  search?: string
  paymentPurposeNumber?: string
  skip: number
  take: number
}

export type PaymentPurposeListViewResult = {
  rows: PaymentPurposeListRow[]
  total: number
}

export async function listPaymentPurposesForListView(
  options: PaymentPurposeListViewOptions,
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurposeListViewResult> {
  const clauses: Prisma.FlooringPaymentPurposeWhereInput[] = []
  if (options.search) {
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }
  // ROW-number bar: EXACT match on the generated int (btree), mirroring the
  // job-type / entity-type / warehouse number bars. Strip non-digits so "7" or
  // "ROW-7" both resolve to 7; a non-numeric query hits the -1 sentinel (the
  // sequence is always positive) so it matches nothing.
  const paymentPurposeNumber = options.paymentPurposeNumber?.trim()
  if (paymentPurposeNumber) {
    const digits = paymentPurposeNumber.replace(/\D/g, "")
    const parsed = digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN
    clauses.push({
      paymentPurposeNumberInt: { equals: Number.isInteger(parsed) ? parsed : -1 },
    })
  }
  const where = clauses.length > 0 ? { AND: clauses } : undefined

  const [total, rows] = await Promise.all([
    client.flooringPaymentPurpose.count({ where }),
    client.flooringPaymentPurpose.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizePaymentPurpose),
  }
}

export async function getPaymentPurposeById(
  id: string,
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurpose> {
  const paymentPurpose = await client.flooringPaymentPurpose.findUniqueOrThrow({
    where: { id },
  })
  return normalizePaymentPurpose(paymentPurpose)
}

/**
 * Resolve the payment-purpose rows immediately before/after the given numeric
 * sort key in the global ROW-number order (`paymentPurposeNumberInt`). Powers
 * the record-view shell stepper — deliberately global (no scoping), two
 * single-row lookups on the `paymentPurposeNumberInt` index. Both null when the
 * key is null (no generated value yet) or the row sits at the sequence edge.
 */
async function getPaymentPurposeNeighbors(
  paymentPurposeNumberInt: number | null,
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurposeNeighbors> {
  if (paymentPurposeNumberInt === null) return NO_PAYMENT_PURPOSE_NEIGHBORS

  const { previous: previousQuery, next: nextQuery } = numberNeighborQueries(
    "paymentPurposeNumberInt",
    paymentPurposeNumberInt,
  )
  const [previous, next] = await Promise.all([
    client.flooringPaymentPurpose.findFirst({ ...previousQuery, select: { id: true } }),
    client.flooringPaymentPurpose.findFirst({ ...nextQuery, select: { id: true } }),
  ])

  return {
    previousPaymentPurpose: previous ? { id: previous.id } : null,
    nextPaymentPurpose: next ? { id: next.id } : null,
  }
}

export async function getPaymentPurposeDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurposeDetailRecord | null> {
  const row = await client.flooringPaymentPurpose.findUnique({ where: { id } })
  if (!row) return null
  const neighbors =
    options.withNeighbors === false
      ? NO_PAYMENT_PURPOSE_NEIGHBORS
      : await getPaymentPurposeNeighbors(row.paymentPurposeNumberInt, client)
  return { ...normalizePaymentPurpose(row), ...neighbors }
}

/**
 * Resolve the slim {id,name,color} option shape for a known set of ids — used to
 * seed chip labels for URL-restored payment-purpose filters on first paint.
 * Order follows `name` for stable chips; unknown ids simply drop out. (Not wired
 * to a route yet — kept ready for the payments linking pass.)
 */
export async function listPaymentPurposeOptionsByIds(
  ids: ReadonlyArray<string>,
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurposeOption[]> {
  if (ids.length === 0) return []
  const rows = await client.flooringPaymentPurpose.findMany({
    where: { id: { in: [...ids] } },
    orderBy: [{ name: "asc" }, { id: "asc" }],
    select: { id: true, name: true, color: true },
  })
  return rows.map(normalizePaymentPurposeOption)
}

export type PaymentPurposeOptionsSearchArgs = {
  search?: string
  skip?: number
  take: number
}

export type PaymentPurposeOptionsSearchResult = {
  items: PaymentPurposeOption[]
  hasMore: boolean
}

// Paginated payment-purpose search for the array picker. ILIKE on `name`,
// take+1 to detect a next page. (Not wired to a route yet — kept ready for the
// payments linking pass.)
export async function searchPaymentPurposeOptions(
  args: PaymentPurposeOptionsSearchArgs,
  client: PaymentPurposesDbClient = db,
): Promise<PaymentPurposeOptionsSearchResult> {
  const where = args.search
    ? { name: { contains: args.search, mode: "insensitive" as const } }
    : undefined

  const rows = await client.flooringPaymentPurpose.findMany({
    where,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    skip: args.skip ?? 0,
    take: args.take + 1,
    select: { id: true, name: true, color: true },
  })

  const hasMore = rows.length > args.take
  const page = hasMore ? rows.slice(0, args.take) : rows
  return { items: page.map(normalizePaymentPurposeOption), hasMore }
}
