export function normalizeManufacturer(manufacturer: {
  id: string
  name: string
  companyName: string | null
  website: string | null
  phone: string | null
  email: string | null
  createdAt: Date
  updatedAt: Date
  _count?: { products: number }
}) {
  return {
    id: manufacturer.id,
    name: manufacturer.name,
    companyName: manufacturer.companyName ?? "",
    website: manufacturer.website ?? "",
    phone: manufacturer.phone ?? "",
    email: manufacturer.email ?? "",
    productsCount: manufacturer._count?.products ?? 0,
    createdAt: manufacturer.createdAt.toISOString(),
    updatedAt: manufacturer.updatedAt.toISOString(),
  }
}
