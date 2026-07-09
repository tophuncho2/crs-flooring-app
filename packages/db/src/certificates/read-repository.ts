import { db } from "../client.js"
import { Prisma } from "../generated/prisma/client.js"
import type { PrismaClient } from "../generated/prisma/client.js"
import {
  normalizeCertificate,
  normalizeCertificateListRow,
  type CertificateDetailRecord,
  type CertificateListRow,
} from "@builders/domain"
import { buildCertificatesOrderBy } from "./order-by.js"

type CertificatesDbClient = PrismaClient | Prisma.TransactionClient

export type CertificatesListSortEntry = {
  /** Sort column — maps through `certificateFieldOrderBy`. */
  field: string
  direction: "asc" | "desc"
}

export type CertificatesListSort = {
  /** Ordered sort columns, highest priority first. An empty list falls straight
   * through to the `expirationDate`+`id` default. */
  entries: CertificatesListSortEntry[]
}

const certificateSelect = {
  id: true,
  name: true,
  expirationDate: true,
  internalNotes: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  entity: {
    select: { id: true, entity: true },
  },
} as const

export async function getCertificateById(
  id: string,
  client: CertificatesDbClient = db,
): Promise<CertificateDetailRecord> {
  const certificate = await client.certificate.findUniqueOrThrow({
    where: { id },
    select: certificateSelect,
  })
  return normalizeCertificate(certificate)
}

export type CertificateListViewOptions = {
  search?: string
  /** Ordered multi-column sort; falls through to the expirationDate+id default. */
  sort?: CertificatesListSort
  filters?: {
    entityId?: ReadonlyArray<string>
  }
  skip: number
  take: number
}

export type CertificateListViewResult = {
  rows: CertificateListRow[]
  total: number
}

function buildListViewWhere(
  options: Pick<CertificateListViewOptions, "search" | "filters">,
): Prisma.CertificateWhereInput | undefined {
  const clauses: Prisma.CertificateWhereInput[] = []

  if (options.search) {
    clauses.push({ name: { contains: options.search, mode: "insensitive" } })
  }

  const entityIds = options.filters?.entityId
  if (entityIds && entityIds.length > 0) {
    clauses.push({ entityId: { in: [...entityIds] } })
  }

  if (clauses.length === 0) return undefined
  if (clauses.length === 1) return clauses[0]
  return { AND: clauses }
}

export async function listCertificatesForListView(
  options: CertificateListViewOptions,
  client: CertificatesDbClient = db,
): Promise<CertificateListViewResult> {
  const where = buildListViewWhere(options)

  const [total, rows] = await Promise.all([
    client.certificate.count({ where }),
    client.certificate.findMany({
      where,
      orderBy: buildCertificatesOrderBy(options.sort),
      skip: options.skip,
      take: options.take,
      select: certificateSelect,
    }),
  ])

  return {
    total,
    rows: rows.map(normalizeCertificateListRow),
  }
}
