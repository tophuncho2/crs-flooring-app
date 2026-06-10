import { db } from "../../client.js"
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js"
import {
  normalizeLaborPayment,
  type LaborPayment,
  type LaborPaymentListRow,
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
