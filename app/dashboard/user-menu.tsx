"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export default function UserMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false)

  const firstLetter = email.charAt(0).toUpperCase()

  return (
    <div className="relative">
      
      {/* Circle Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center font-bold text-black hover:bg-blue-400 transition"
      >
        {firstLetter}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-gray-900 border border-blue-500 rounded-lg shadow-lg overflow-hidden">
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 text-sm"
          >
            Logout
          </button>
        </div>
      )}

    </div>
  )
}