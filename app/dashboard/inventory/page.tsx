import { requireToolAccess } from "@/server/auth/session"
import { redirect } from "next/navigation"

export default async function InventoryPage() {
  await requireToolAccess("warehouse")
  redirect("/dashboard/flooring/inventory")
}
