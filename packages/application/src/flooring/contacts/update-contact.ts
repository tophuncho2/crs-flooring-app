import { updateContactRecord } from "@builders/db"
import type { ContactInput, ContactResult } from "./types.js"

export async function updateContactUseCase(
  id: string,
  input: ContactInput,
): Promise<ContactResult> {
  return updateContactRecord(id, input)
}
