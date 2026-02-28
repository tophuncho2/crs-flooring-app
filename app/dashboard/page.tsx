import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import UserMenu from "./user-menu"
import { redirect } from "next/navigation"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

if (!session) {
  redirect("/login")
}

  return (
    <div className="min-h-screen bg-black text-white relative">

      {/* Top Right User Menu */}
      <div className="absolute top-6 right-6">
<UserMenu 
  email={session?.user?.email ?? ""} 
  role={(session?.user as any)?.role ?? ""}
/>      </div>

      {/* Page Content */}
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>
      </div>

    </div>
  )
}
const session = await getServerSession(authOptions)

console.log("ROLE:", session?.user?.role)
