import { redirect } from "next/navigation"
import { DEFAULT_DASHBOARD_ROUTE } from "@/hooks/navigation"
export default async function Dashboard() {
  redirect(DEFAULT_DASHBOARD_ROUTE)
}
