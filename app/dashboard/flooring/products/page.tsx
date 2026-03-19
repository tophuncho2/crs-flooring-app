import { requireToolAccess } from "@/server/auth/session"
import FlooringProductsClient from "@/features/flooring/products/components/products-client"
import { getProductsPageData } from "@/features/flooring/products/queries"

export default async function FlooringProductsPage() {
  await requireToolAccess("products")
  const pageData = await getProductsPageData()

  return <FlooringProductsClient {...pageData} />
}
