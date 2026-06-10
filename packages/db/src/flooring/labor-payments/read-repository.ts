import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeLaborPayment,
  type LaborPayment,
  type LaborPaymentListRow,
  type LaborPaymentPage,
} from "@builders/domain"

type LaborPaymentsDbClient = PrismaClient | Prisma.TransactionClient

const laborPaymentInclude = {
  contact: { select: { name: true } },
} satisfies Prisma.FlooringLaborPaymentInclude

export type LaborPaymentListViewOptions = {
  search?: string
  skip: number
  take: number
}

export type LaborPaymentListViewResult = {
  rows: LaborPaymentListRow[]
  total: number
}

export async function listLaborPaymentsForListView(
  options: LaborPaymentListViewOptions,
  client: LaborPaymentsDbClient = db,
): Promise<LaborPaymentListViewResult> {
  const where: Prisma.FlooringLaborPaymentWhereInput | undefined = options.search
    ? { contact: { name: { contains: options.search, mode: "insensitive" } } }
    : undefined

  const [total, rows] = await Promise.all([
    client.flooringLaborPayment.count({ where }),
    client.flooringLaborPayment.findMany({
      where,
      include: laborPaymentInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: options.skip,
      take: options.take,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeLaborPayment),
  }
}

export async function getLaborPaymentById(
  id: string,
  client: LaborPaymentsDbClient = db,
): Promise<LaborPayment> {
  const laborPayment = await client.flooringLaborPayment.findUniqueOrThrow({
    where: { id },
    include: laborPaymentInclude,
  })
  return normalizeLaborPayment(laborPayment)
}

export async function countLaborPayments(client: LaborPaymentsDbClient = db): Promise<number> {
  return client.flooringLaborPayment.count()
}

export type LaborPaymentsForContactPageOptions = {
  contactId: string
  skip: number
  take: number
}

/**
 * Paginated read of one contact's labor payments. Powers the contact record
 * view's labor-payments section. Fetches `take + 1` to report `hasMore` without
 * a separate count query. Mirrors `listInventoryAdjustmentsPage`.
 */
export async function listLaborPaymentsForContactPage(
  options: LaborPaymentsForContactPageOptions,
  client: LaborPaymentsDbClient = db,
): Promise<LaborPaymentPage> {
  const rows = await client.flooringLaborPayment.findMany({
    where: { contactId: options.contactId },
    include: laborPaymentInclude,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    skip: options.skip,
    take: options.take + 1,
  })

  const hasMore = rows.length > options.take
  const page = hasMore ? rows.slice(0, options.take) : rows

  return {
    rows: page.map(normalizeLaborPayment),
    hasMore,
  }
}
