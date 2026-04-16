import { listCategories, withPrismaConnectivityHandling } from "@builders/db"

export async function getCategoriesPageData() {
  return withPrismaConnectivityHandling(async () => listCategories())
}
