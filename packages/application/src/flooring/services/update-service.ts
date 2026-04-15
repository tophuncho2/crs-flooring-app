import { Prisma, updateServiceRecord, getServiceById, withDatabaseTransaction } from "@builders/db"
import type { ServiceInput, ServiceResult } from "./types.js"

export async function updateServiceUseCase(
  id: string,
  input: ServiceInput,
  client?: Prisma.TransactionClient,
): Promise<ServiceResult> {
  return withDatabaseTransaction(async (tx) => {
    const c = client ?? tx
    await updateServiceRecord(id, input, c)
    return getServiceById(id, c)
  })
}
