import { searchContactOptions } from "@builders/db"
import type { ContactOption } from "@builders/domain"

export type SearchContactOptionsInput = {
  search?: string
  take?: number
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchContactOptionsUseCase(
  input: SearchContactOptionsInput,
): Promise<ContactOption[]> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  return searchContactOptions({ search, take })
}
