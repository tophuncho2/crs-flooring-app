import { ProductExecutionError, updateProductUseCase } from "@builders/application"
import { getProductById } from "@builders/db"
import { validateUpdateProductInput } from "../../../_validators"
import { parseUuidParam } from "@/server/http/api-helpers"
import { CRUD_UPDATE_SECTION } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"

export const PATCH = createMutationRoute({
  scope: "products.primary.section.replace",
  route: "/api/products/[id]/primary/section",
  rateLimit: CRUD_UPDATE_SECTION,
  parseParams: async (raw) => ({ id: parseUuidParam((raw as { id: string }).id, "id") }),
  parseInput: validateUpdateProductInput,
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
    message: "Product changed before section save completed. Refresh and try again.",
  },
  useCase: ({ input, access, params }) => updateProductUseCase(params.id, input, access.user.email),
  telemetry: ({ params }) => ({
    action: "products.primary.section.replace",
    message: "Product primary section replaced",
    entityType: "flooringProduct",
    entityId: params.id,
  }),
  status: 200,
  buildResponseBody: ({ result }) => ({ product: result }),
})
