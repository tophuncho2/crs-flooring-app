import { listCategories, type CategoryRecord } from "@builders/db"

export async function listCategoriesUseCase(): Promise<CategoryRecord[]> {
  return listCategories()
}
