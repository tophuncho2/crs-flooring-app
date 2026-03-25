import { prisma } from "@builders/db"
import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
  type PrismaPageDataResult,
} from "@builders/db"
import { normalizeServiceOption, normalizeServiceRow } from "../domain/services"
import type { ServiceRow, UnitOption } from "../domain/types"

async function loadServices() {
  const services = await prisma.flooringService.findMany({
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          templateItems: true,
          workOrderItems: true,
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return services.map(normalizeServiceRow)
}

async function loadUnitOptions(): Promise<UnitOption[]> {
  const units = await prisma.flooringUnitOfMeasure.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
    },
  })

  return units
}

export async function listServices() {
  return loadServices()
}

export async function listServiceOptions() {
  const services = await prisma.flooringService.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      baseCost: true,
      notes: true,
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return services.map(normalizeServiceOption)
}

export async function getServicesPageData(): Promise<PrismaPageDataResult<{
  services: ServiceRow[]
  unitOptions: UnitOption[]
}>> {
  return withPrismaConnectivityHandling(async () => ({
    services: await loadServices(),
    unitOptions: await loadUnitOptions(),
  }))
}

export async function getServiceById(id: string): Promise<ServiceRow> {
  const service = await prisma.flooringService.findUniqueOrThrow({
    where: { id },
    include: {
      unit: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          templateItems: true,
          workOrderItems: true,
        },
      },
    },
  })

  return normalizeServiceRow(service)
}

export async function getServiceDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  service: ServiceRow
  unitOptions: UnitOption[]
}>> {
  try {
    const [service, unitOptions] = await Promise.all([
      getServiceById(id),
      loadUnitOptions(),
    ])

    return {
      ok: true,
      data: {
        service,
        unitOptions,
      },
    }
  } catch (error) {
    if (isPrismaNotFoundError(error)) {
      return { ok: false, notFound: true }
    }

    return {
      ok: false,
      error: createPrismaPageLoadIssue(error, {
        code: "SERVICE_DETAIL_LOAD_FAILED",
        title: "Service Unavailable",
        message: "The app could not load this service.",
        detail: "The service record could not be loaded.",
      }),
    }
  }
}
