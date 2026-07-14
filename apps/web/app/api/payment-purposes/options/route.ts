import { searchPaymentPurposeOptionsUseCase } from "@builders/application"
import { createQueryRoute } from "@/server/http/run-query"
import { validatePaymentPurposeOptionsQuery } from "../_validators"

export const GET = createQueryRoute({
  route: "/api/payment-purposes/options",
  parseInput: (searchParams) => validatePaymentPurposeOptionsQuery(searchParams),
  useCase: ({ input }) => searchPaymentPurposeOptionsUseCase(input),
  // The use case paginates ({ items, hasMore }); the picker consumes a single
  // page, so expose the rows as `options` (mirrors the job-types contract).
  buildResponseBody: ({ result }) => ({ options: result.items }),
})
