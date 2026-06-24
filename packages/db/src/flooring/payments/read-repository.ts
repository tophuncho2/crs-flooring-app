import { db } from "../../client.js"
import { numberNeighborQueries } from "../../shared/number-neighbors.js"
import { paymentLinksInclude, projectPaymentLinks } from "./payment-links.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeMoneyAmount,
  normalizePayment,
  type Payment,
  type PaymentDetail,
  type PaymentNeighbor,
  type PaymentPage,
} from "@builders/domain"

type PaymentsDbClient = PrismaClient | Prisma.TransactionClient

export type PaymentListViewOptions = {
  skip: number
  take: number
  // Exact payment-number search — free text, digits parsed to match the
  // generated `paymentNumberInt` column.
  paymentNumber?: string
  // Exact amount search — free text canonicalized via `normalizeMoneyAmount`
  // and matched against the `amount` column.
  amount?: string
}

type PaymentNeighbors = {
  previousPayment: PaymentNeighbor | null
  nextPayment: PaymentNeighbor | null
}

const NO_PAYMENT_NEIGHBORS: PaymentNeighbors = {
  previousPayment: null,
  nextPayment: null,
}

/**
 * Build the list-view `where` from the filters. Today the only filter is the
 * exact payment-number search: strip non-digits, parse to int, and match the
 * generated `paymentNumberInt` column. A non-empty-but-unparseable input falls
 * back to the impossible sentinel `-1` so it returns no rows (rather than all).
 */
function buildPaymentListWhere(
  options: PaymentListViewOptions,
): Prisma.FlooringPaymentWhereInput {
  const where: Prisma.FlooringPaymentWhereInput = {}
  const paymentNumber = options.paymentNumber?.trim() ?? ""
  if (paymentNumber.length > 0) {
    const digits = paymentNumber.replace(/\D/g, "")
    const parsed = digits.length > 0 ? Number.parseInt(digits, 10) : Number.NaN
    where.paymentNumberInt = { equals: Number.isInteger(parsed) ? parsed : -1 }
  }
  const amount = options.amount?.trim() ?? ""
  if (amount.length > 0) {
    // `normalizeMoneyAmount` canonicalizes to `X.XX`, or returns "" for garbage.
    // Fall back to the impossible sentinel `-1` (amount is unsigned) so an
    // unparseable input returns no rows rather than all.
    const normalized = normalizeMoneyAmount(amount)
    where.amount = { equals: normalized.length > 0 ? normalized : "-1" }
  }
  return where
}

/**
 * Newest-first paginated read of all payments. Counted (`total` via a parallel
 * `count`) so the list-view engine drives its pagination contract. The table
 * stands alone — no joins. Ordered `(createdAt, id) DESC` to match the keyset
 * index. No filtering this slice.
 */
export async function listPaymentsForListView(
  options: PaymentListViewOptions,
  client: PaymentsDbClient = db,
): Promise<PaymentPage> {
  const where = buildPaymentListWhere(options)
  const [total, rows] = await Promise.all([
    client.flooringPayment.count({ where }),
    client.flooringPayment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizePayment),
  }
}

/** Single payment by id, or `null` when it does not exist. */
export async function getPaymentById(
  id: string,
  client: PaymentsDbClient = db,
): Promise<Payment | null> {
  const payment = await client.flooringPayment.findUnique({ where: { id } })
  return payment ? normalizePayment(payment) : null
}

/**
 * Resolve the payment rows immediately before/after the given numeric sort key
 * in the global payment-number order (`paymentNumberInt`). Powers the
 * record-view shell stepper — deliberately global: no filter scoping, it walks
 * the raw number line. Two single-row lookups on the `paymentNumberInt` index.
 * Both null when the key is null (no generated value yet) or the row is at the
 * sequence's edge.
 */
async function getPaymentNeighbors(
  paymentNumberInt: number | null,
  client: PaymentsDbClient = db,
): Promise<PaymentNeighbors> {
  if (paymentNumberInt === null) return NO_PAYMENT_NEIGHBORS

  const { previous: previousQuery, next: nextQuery } = numberNeighborQueries(
    "paymentNumberInt",
    paymentNumberInt,
  )
  const [previous, next] = await Promise.all([
    client.flooringPayment.findFirst({ ...previousQuery, select: { id: true } }),
    client.flooringPayment.findFirst({ ...nextQuery, select: { id: true } }),
  ])

  return {
    previousPayment: previous ? { id: previous.id } : null,
    nextPayment: next ? { id: next.id } : null,
  }
}

/**
 * Read the full payment detail. By default it also resolves the adjacent rows
 * for the record-view shell stepper; pass `{ withNeighbors: false }` on paths
 * that only read a snapshot to skip the two extra lookups. Returns `null` when
 * the payment does not exist.
 */
export async function getPaymentDetailById(
  id: string,
  options: { withNeighbors?: boolean } = {},
  client: PaymentsDbClient = db,
): Promise<PaymentDetail | null> {
  const payment = await client.flooringPayment.findUnique({
    where: { id },
    include: paymentLinksInclude,
  })
  if (!payment) return null

  const neighbors =
    options.withNeighbors === false
      ? NO_PAYMENT_NEIGHBORS
      : await getPaymentNeighbors(payment.paymentNumberInt, client)

  return {
    ...normalizePayment({ ...payment, ...projectPaymentLinks(payment) }),
    previousPayment: neighbors.previousPayment,
    nextPayment: neighbors.nextPayment,
  }
}
