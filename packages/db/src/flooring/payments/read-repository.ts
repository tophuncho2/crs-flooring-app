import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import { normalizePayment, type Payment, type PaymentPage } from "@builders/domain"

type PaymentsDbClient = PrismaClient | Prisma.TransactionClient

export type PaymentListViewOptions = {
  skip: number
  take: number
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
  const [total, rows] = await Promise.all([
    client.flooringPayment.count(),
    client.flooringPayment.findMany({
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
