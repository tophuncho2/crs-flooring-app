import { getContactDeleteBlockedMessage, isContactDeleteBlocked } from "@builders/domain"
import { createAppError } from "@/server/http/api-helpers"
import {
  createContactRecord,
  deleteContactRecordById,
  getContactDeleteState,
  updateContactRecord,
} from "../data/server-records"
import type { ContactDetail, ContactType } from "../domain/types"

export async function createContactEntry(input: {
  name: string
  type: ContactType
}): Promise<ContactDetail> {
  return createContactRecord(input)
}

export async function updateContactEntry(
  id: string,
  input: {
    name: string
    type: ContactType
  },
): Promise<ContactDetail> {
  return updateContactRecord(id, input)
}

export async function deleteContactEntry(id: string) {
  const contact = await getContactDeleteState(id)

  if (!contact) {
    throw createAppError("Contact not found", { status: 404 })
  }

  const linkState = {
    templateAssignments: contact._count.templateSalesReps,
    workOrderAssignments: contact._count.workOrderSalesReps,
  }

  if (isContactDeleteBlocked(linkState)) {
    throw createAppError(getContactDeleteBlockedMessage(linkState), { status: 409 })
  }

  await deleteContactRecordById(id)
  return { ok: true as const }
}
