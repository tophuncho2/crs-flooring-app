type ManufacturerLike = {
  id: string
  companyName: string
}

type ManufacturerFormInput = {
  companyName: string
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

  const normalizedCompanyName = companyName.toLowerCase()
  const hasDuplicate = existingManufacturers.some(
    (manufacturer) =>
      manufacturer.id !== currentId && manufacturer.companyName.trim().toLowerCase() === normalizedCompanyName,
  )

  return hasDuplicate ? "Company name must be unique" : ""
}
