import { createContactRecord } from "@builders/db"
import type { ContactInput, ContactResult } from "./types.js"

export async function createContactUseCase(input: ContactInput): Promise<ContactResult> {
  return createContactRecord(input)
}
