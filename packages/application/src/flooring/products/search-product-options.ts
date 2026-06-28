import { searchProductOptions } from "@builders/db"
import type { ProductOption } from "@builders/domain"

export type SearchProductOptionsInput = {
  search?: string
  categoryId?: string
  style?: string
  color?: string
  namingAddon?: string
  skip?: number
  take?: number
}

export type SearchProductOptionsResult = {
  items: ProductOption[]
  hasMore: boolean
}

const OPTIONS_DEFAULT_TAKE = 20
const OPTIONS_MAX_TAKE = 50

export async function searchProductOptionsUseCase(
  input: SearchProductOptionsInput,
): Promise<SearchProductOptionsResult> {
  const search = input.search?.trim() || undefined
  const categoryId = input.categoryId?.trim() || undefined
  const style = input.style?.trim() || undefined
  const color = input.color?.trim() || undefined
  const namingAddon = input.namingAddon?.trim() || undefined
  const requested = Math.floor(input.take ?? OPTIONS_DEFAULT_TAKE)
  const take = Math.max(1, Math.min(OPTIONS_MAX_TAKE, requested))
  const skip = Math.max(0, Math.floor(input.skip ?? 0))
  return searchProductOptions({ search, categoryId, style, color, namingAddon, skip, take })
}
