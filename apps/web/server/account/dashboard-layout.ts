import type { DataAccessContext } from "@/server/db/context"
import { prisma } from "@/server/db/prisma"

export async function getDashboardLayoutUser(userId: string, db: DataAccessContext = prisma) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isVerified: true,
      hiddenFlooringNavSlugs: true,
      flooringNavOrderSlugs: true,
    },
  })
}
