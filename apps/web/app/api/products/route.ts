import { createProductUseCase, listProductsUseCase } from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreateProductInput, validateListProductsQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/products",
  parseInput: (searchParams) => validateListProductsQuery(searchParams),
  useCase: ({ input }) => listProductsUseCase(input),
})

export const POST = createMutationRoute({
  scope: "products.create",
  route: "/api/products",
  rateLimit: CRUD_CREATE,
  parseInput: validateCreateProductInput,
  useCase: ({ input, access }) => createProductUseCase(input, access.user.email),
  telemetry: { action: "products.create", message: "Product created", entityType: "flooringProduct" },
  status: 201,
  buildResponseBody: ({ result }) => ({ product: result }),
})
