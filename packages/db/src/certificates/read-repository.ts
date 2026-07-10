import { db } from "../client.js"
import { combineAnd } from "../shared/where.js"
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

const certificateFileSelect = {
  id: true,
  fileName: true,
  contentType: true,
  sizeBytes: true,
  createdAt: true,
  createdBy: true,
} as const

/**
 * Bucket-pointer projection for a single file — carries `certificateId` (for the
 * ownership check) and `objectKey` (for S3), which the normalized record omits.
 */
export type CertificateFileRow = {
  id: string
  certificateId: string
  objectKey: string
  fileName: string
  contentType: string
  sizeBytes: number
  createdAt: Date
  createdBy: string | null
}

export async function getCertificateById(
  id: string,
  client: CertificatesDbClient = db,
): Promise<CertificateDetailRecord> {
  const certificate = await client.certificate.findUniqueOrThrow({
    where: { id },
    select: {
      ...certificateSelect,
      files: { select: certificateFileSelect, orderBy: { createdAt: "asc" } },
    },
  })
  return normalizeCertificate(certificate)
}

/** One file row incl. `certificateId` + `objectKey`; null when it doesn't exist. */
export async function getCertificateFileById(
  fileId: string,
  client: CertificatesDbClient = db,
): Promise<CertificateFileRow | null> {
  return client.certificateFile.findUnique({
    where: { id: fileId },
    select: {
      id: true,
      certificateId: true,
      objectKey: true,
      fileName: true,
      contentType: true,
      sizeBytes: true,
      createdAt: true,
      createdBy: true,
    },
  })
}

/** Object keys for every file under a certificate — for S3 cascade cleanup. */
export async function listCertificateFileKeysByCertificateId(
  certificateId: string,
  client: CertificatesDbClient = db,
): Promise<string[]> {
  const rows = await client.certificateFile.findMany({
    where: { certificateId },
    select: { objectKey: true },
  })
  return rows.map((row) => row.objectKey)
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

  return combineAnd(clauses)
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
