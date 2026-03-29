type CategoryLike = {
  id: string
  name: string
}

type CategoryFormInput = {
  name: string
}

export function normalizeCategoryName(value: string) {
  return value.trim().toLowerCase()
}

export function validateCategoryForm(
  input: CategoryFormInput,
  existingCategories: CategoryLike[] = [],
  currentId?: string,
) {
  const name = input.name.trim()

  if (!name) {
    return "Category name is required"
  }

  const normalizedName = normalizeCategoryName(name)
  const hasDuplicate = existingCategories.some(
    (category) => category.id !== currentId && normalizeCategoryName(category.name) === normalizedName,
  )

  return hasDuplicate ? "Category name must be unique" : ""
}
