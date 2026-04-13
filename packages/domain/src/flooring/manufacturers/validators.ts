type ManufacturerLike = {
  id: string
  companyName: string
}

type ManufacturerFormInput = {
  companyName: string
}

export function normalizeManufacturerCompanyName(value: string) {
  return value.trim().toLowerCase()
}

export function validateManufacturerForm(
  input: ManufacturerFormInput,
  existingManufacturers: ManufacturerLike[] = [],
  currentId?: string,
) {
  const companyName = input.companyName.trim()

  if (!companyName) {
    return "Company name is required"
  }

  const normalizedCompanyName = normalizeManufacturerCompanyName(companyName)
  const hasDuplicate = existingManufacturers.some(
    (manufacturer) =>
      manufacturer.id !== currentId && normalizeManufacturerCompanyName(manufacturer.companyName) === normalizedCompanyName,
  )

  return hasDuplicate ? "Company name must be unique" : ""
}
