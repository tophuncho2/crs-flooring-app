import { prisma, type DataAccessContext } from "@builders/db"

export async function getDashboardLayoutUser(userId: string, db: DataAccessContext = prisma) {
  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      rank: true,
    },
  })
}
