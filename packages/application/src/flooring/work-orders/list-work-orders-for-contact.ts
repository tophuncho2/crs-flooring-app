import type { WorkOrdersForContactPage } from "@builders/domain"
import { listWorkOrdersForContactPage, sumLaborPaymentCostForContact } from "@builders/db"

export type ListWorkOrdersForContactInput = {
  contactId: string
  skip?: number
  take?: number
}

const DEFAULT_TAKE = 15
const MAX_TAKE = 50

/**
 * Contact record-view Statistics section payload: a page of the contact's work
 * orders plus the contact's total labor cost. The work-order rows list only
 * work orders the contact has labor payments on; the total sums ALL the
 * contact's labor payments (incl. ones with no linked work order), so it is
 * broader than the listed rows.
 */
export async function listWorkOrdersForContactUseCase(
  input: ListWorkOrdersForContactInput,
): Promise<WorkOrdersForContactPage> {
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  const requested = Math.floor(input.take ?? DEFAULT_TAKE)
  const take = Math.max(1, Math.min(MAX_TAKE, requested))

  const [{ rows, total }, laborCostTotal] = await Promise.all([
    listWorkOrdersForContactPage({ contactId: input.contactId, skip, take }),
    sumLaborPaymentCostForContact(input.contactId),
  ])

  return { rows, total, laborCostTotal }
}
