import type { LaborPaymentPage } from "@builders/domain"
import { listLaborPaymentsForContactPage } from "@builders/db"

export type ListLaborPaymentsForContactInput = {
  contactId: string
  skip?: number
  take?: number
}

const DEFAULT_TAKE = 15
const MAX_TAKE = 50

export async function listLaborPaymentsForContactUseCase(
  input: ListLaborPaymentsForContactInput,
): Promise<LaborPaymentPage> {
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))

  return listLaborPaymentsForContactPage({
    contactId: input.contactId,
    skip,
    take,
  })
}
