import { listInventoryOptions } from "@builders/db"
import { createQueryRoute } from "@/server/http/run-query"

export const GET = createQueryRoute({
  route: "/api/inventory/options",
  parseInput: () => ({}),
  useCase: () => listInventoryOptions(),
})
