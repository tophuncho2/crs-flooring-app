import { searchTemplateOptions } from "@builders/db"
import type { TemplateOption } from "@builders/domain"

export type SearchTemplateOptionsInput = {
  search?: string
  propertyId: string
  skip?: number
  take?: number
}

export type SearchTemplateOptionsResult = {
  items: TemplateOption[]
  hasMore: boolean
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchTemplateOptionsUseCase(
  input: SearchTemplateOptionsInput,
): Promise<SearchTemplateOptionsResult> {
  const search = input.search?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchTemplateOptions({ search, propertyId: input.propertyId, skip, take })
}
