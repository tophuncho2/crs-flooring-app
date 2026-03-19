import { requireToolAccess } from "@/server/auth/session"
import ManufacturersClient from "@/features/flooring/manufacturers/components/manufacturers-client"
import { listManufacturers } from "@/features/flooring/manufacturers/queries"
import { normalizeManufacturer } from "@/features/flooring/manufacturers/services"

export default async function ManufacturersPage() {
  await requireToolAccess("products")

  const manufacturers = await listManufacturers()

  return (
    <ManufacturersClient
      initialManufacturers={manufacturers.map(normalizeManufacturer)}
    />
  )
}
