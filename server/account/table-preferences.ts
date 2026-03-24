import { prisma } from "@/server/db/prisma"
import type { TablePreferencePayload } from "@/features/flooring/shared/controllers/table/table-preferences"

export async function getUserTablePreference(userId: string, tableKey: string): Promise<TablePreferencePayload> {
  const preference = await prisma.userTablePreference.findUnique({
    where: {
      userId_tableKey: {
        userId,
        tableKey,
      },
    },
    select: {
      hiddenColumnKeys: true,
      columnOrderKeys: true,
    },
  })

  return {
    hiddenColumnKeys: preference?.hiddenColumnKeys ?? [],
    columnOrderKeys: preference?.columnOrderKeys ?? [],
  }
}
