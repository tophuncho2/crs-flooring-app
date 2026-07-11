import { deleteProductUseCase, ProductExecutionError } from "@builders/application"
import { getProductById } from "@builders/db"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_DELETE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"

export const DELETE = createMutationRoute({
  scope: "products.delete",
  route: "/api/products/[id]",
  rateLimit: CRUD_DELETE,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: (value) => value,
  concurrency: {
    loadSnapshot: async ({ params }) => {
      const snapshot = await getProductById(params.id)
      if (!snapshot) {
        throw new ProductExecutionError({
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
          status: 404,
        })
      }
      return snapshot
    },
    snapshotKey: "product",
    message: "Product changed before delete completed. Refresh and try again.",
  },
  useCase: ({ params }) => deleteProductUseCase(params.id),
  telemetry: ({ params }) => ({
    action: "products.delete",
    message: "Product deleted",
    entityType: "flooringProduct",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: () => ({ ok: true as const }),
})
