import { createContactRecord } from "@builders/db"
import type { ContactResult, CreateContactInput } from "./types.js"

export async function createContactUseCase(input: CreateContactInput): Promise<ContactResult> {
  return createContactRecord(input)
}
