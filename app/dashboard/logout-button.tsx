"use client"

import { signOut } from "next-auth/react"

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="px-6 py-2 bg-red-500 rounded-lg hover:bg-red-600 transition"
    >
      Logout
    </button>
  )
}