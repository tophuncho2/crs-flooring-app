type CategoryLike = {
  id: string
  name: string
}

type CategoryFormInput = {
  name: string
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

  const normalizedName = name.toLowerCase()
  const hasDuplicate = existingCategories.some(
    (category) => category.id !== currentId && category.name.trim().toLowerCase() === normalizedName,
  )

  return hasDuplicate ? "Category name must be unique" : ""
}
