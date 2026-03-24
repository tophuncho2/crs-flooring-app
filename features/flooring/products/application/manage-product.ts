import { createProduct, deleteProduct, updateProduct } from "@/features/flooring/products/data/mutations"
import { validateCreateProductInput, validateUpdateProductInput } from "@/features/flooring/products/domain/validators"

export async function createProductUseCase(body: Record<string, unknown>) {
  return createProduct(validateCreateProductInput(body))
}

export async function updateProductUseCase(id: string, body: Record<string, unknown>) {
  return updateProduct(id, validateUpdateProductInput(body))
}

export async function deleteProductUseCase(id: string) {
  await deleteProduct(id)
  return { ok: true as const }
}
