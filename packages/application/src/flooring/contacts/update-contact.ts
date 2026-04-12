import { updateContactRecord } from "@builders/db"
import type { ContactResult, UpdateContactInput } from "./types.js"

export async function updateContactUseCase(
  id: string,
  input: UpdateContactInput,
): Promise<ContactResult> {
  return updateContactRecord(id, input)
}
