import type { Prisma, PrismaClient } from "@prisma/client"
import { createAppError } from "@/server/http/api-helpers"

type DbClient = Prisma.TransactionClient | PrismaClient

type InventoryReferenceOptions = {
  locationField?: string
  importEntryField?: string
}

export async function validateInventoryLocationSelection(
  db: DbClient,
  {
    locationId,
    importEntryId,
  }: {
    locationId: string | null
    importEntryId: string | null
  },
  options: InventoryReferenceOptions = {},
) {
  const locationField = options.locationField ?? "locationId"
  const importEntryField = options.importEntryField ?? "importEntryId"

  const [location, importEntry] = await Promise.all([
    locationId
      ? db.flooringLocation.findUnique({
          where: { id: locationId },
          select: {
            id: true,
            warehouseId: true,
            sectionId: true,
          },
        })
      : Promise.resolve(null),
    importEntryId
      ? db.flooringImportEntry.findUnique({
          where: { id: importEntryId },
          select: {
            id: true,
            warehouseId: true,
          },
        })
      : Promise.resolve(null),
  ])

  if (importEntryId && !importEntry) {
    throw createAppError("Import entry is invalid", { field: importEntryField })
  }

  if (!locationId) {
    return { importEntry, location: null }
  }

  if (!location) {
    throw createAppError("Location is invalid", { field: locationField })
  }

  if (!location.sectionId) {
    throw createAppError("Location must belong to a section", { field: locationField })
  }

  if (importEntry?.warehouseId && location.warehouseId !== importEntry.warehouseId) {
    throw createAppError("Location does not belong to the selected import warehouse", { field: locationField })
  }

  return { importEntry, location }
}
