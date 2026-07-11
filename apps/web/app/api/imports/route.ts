import { createImportUseCase, listImportsUseCase } from "@builders/application"
import { CRUD_CREATE } from "@/server/http/rate-limit-presets"
import { createMutationRoute } from "@/server/http/run-mutation"
import { createQueryRoute } from "@/server/http/run-query"
import { validateCreateImportInput, validateListImportsQuery } from "./_validators"

export const GET = createQueryRoute({
  route: "/api/imports",
  parseInput: (searchParams) => validateListImportsQuery(searchParams),
  useCase: ({ input }) => listImportsUseCase(input),
})

export const POST = createMutationRoute({
  scope: "imports.create",
  route: "/api/imports",
  rateLimit: CRUD_CREATE,
  parseInput: validateCreateImportInput,
  useCase: ({ input, access }) => createImportUseCase(input, access.user.email),
  telemetry: { action: "imports.create", message: "Import created", entityType: "flooringImportEntry" },
  status: 201,
  buildResponseBody: ({ result }) => ({ import: result }),
})
