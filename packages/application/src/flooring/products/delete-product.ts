import {
  Prisma,
  deleteProductById,
  getProductDeleteState,
  withDatabaseTransaction,
} from "@builders/db"
import {
  ProductExecutionError,
  buildProductDeleteBlockedMessage,
  isProductDeleteBlocked,
} from "@builders/domain"

export async function deleteProductUseCase(
  id: string,
  client?: Prisma.TransactionClient,
): Promise<{ ok: true }> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx

    const state = await getProductDeleteState(id, c)
    if (!state) {
      throw new ProductExecutionError({
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found",
        status: 404,
      })
    }

    if (isProductDeleteBlocked(state._count)) {
      throw new ProductExecutionError({
        code: "PRODUCT_IN_USE",
        message: buildProductDeleteBlockedMessage(state._count),
        status: 409,
      })
    }

    await deleteProductById(id, c)

    return { ok: true }
  })
}
