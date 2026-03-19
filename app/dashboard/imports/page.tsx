import { redirect } from "next/navigation"
import { requireToolAccess } from "@/server/auth/session"

export default async function ImportsPage() {
  await requireToolAccess("warehouse")
  redirect("/dashboard/flooring/imports")
}
