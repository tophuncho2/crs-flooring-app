import { Prisma, createServiceRecord, getServiceById, withDatabaseTransaction } from "@builders/db"
import type { ServiceInput, ServiceResult } from "./types.js"

export async function createServiceUseCase(
  input: ServiceInput,
  client?: Prisma.TransactionClient,
): Promise<ServiceResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    const created = await createServiceRecord(input, c)
    return getServiceById(created.id, c)
  })
}
