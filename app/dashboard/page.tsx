import { getServerSession } from "next-auth"
import { authOptions } from "../api/auth/[...nextauth]/route"
import UserMenu from "./user-menu"

export default async function Dashboard() {
  const session = await getServerSession(authOptions)

  return (
    <div className="min-h-screen bg-black text-white relative">

      {/* Top Right User Menu */}
      <div className="absolute top-6 right-6">
        <UserMenu email={session!.user?.email || ""} />
      </div>

      {/* Page Content */}
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-3xl font-bold">
          Dashboard
        </h1>
      </div>

    </div>
  )
}