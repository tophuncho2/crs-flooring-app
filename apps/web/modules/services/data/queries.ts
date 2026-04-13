import {
  createPrismaPageLoadIssue,
  isPrismaNotFoundError,
  listServices as dbListServices,
  listServiceOptions as dbListServiceOptions,
  getServiceById as dbGetServiceById,
  listUnitOfMeasures,
  withPrismaConnectivityHandling,
  type PrismaDetailPageResult,
  type PrismaPageDataResult,
} from "@builders/db"
import type { ServiceRow, UnitOption } from "@builders/domain"

async function loadUnitOptions(): Promise<UnitOption[]> {
  const units = await listUnitOfMeasures()
  return units.map((u) => ({ id: u.id, name: u.name }))
}

export async function listServices() {
  return dbListServices()
}

export async function listServiceOptions() {
  return dbListServiceOptions()
}

export async function getServiceById(id: string) {
  return dbGetServiceById(id)
}

export async function getServiceCreatePageData(): Promise<PrismaPageDataResult<{
  unitOptions: UnitOption[]
}>> {
  return withPrismaConnectivityHandling(async () => ({
    unitOptions: await loadUnitOptions(),
  }))
}

export async function getServicesPageData(): Promise<PrismaPageDataResult<{
  services: ServiceRow[]
  unitOptions: UnitOption[]
}>> {
  return withPrismaConnectivityHandling(async () => ({
    services: await dbListServices(),
    unitOptions: await loadUnitOptions(),
  }))
}

export async function getServiceDetailPageData(id: string): Promise<PrismaDetailPageResult<{
  service: ServiceRow
  unitOptions: UnitOption[]
}>> {
  try {
    const [service, unitOptions] = await Promise.all([
      dbGetServiceById(id),
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
