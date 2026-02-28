"use client"

import { useState, useRef, useEffect } from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function UserMenu({ email, role }: { email: string, role: string }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const firstLetter = email.charAt(0).toUpperCase()

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <div ref={menuRef} className="relative">

      {/* Circle Icon */}
      <button
        onClick={() => setOpen(!open)}
        className="
          w-10 h-10 rounded-full 
          bg-blue-600 
          flex items-center justify-center 
          font-bold text-black 
          transition-all duration-200
          hover:bg-blue-500
          shadow-[0_0_6px_rgba(59,130,246,0.35)]
        "
      >
        {firstLetter}
      </button>

      {open && (
        <div
          className="
            absolute right-0 mt-2 w-44 
            bg-gray-900 
            border border-blue-600/40 
            rounded-lg 
            shadow-[0_0_12px_rgba(59,130,246,0.15)]
            overflow-hidden
            text-sm
          "
        >
          {/* Email Header */}
          <div className="px-4 py-2 border-b border-gray-800 text-blue-400 truncate">
            {email}
          </div>

          {/* Builder Panel Button (only visible to BUILDER) */}
          {role === "BUILDER" && (
            <button
              onClick={() => {
                router.push("/dashboard/builder")
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2 hover:bg-gray-800 transition"
            >
              Builder Panel
            </button>
          )}

          {/* Logout */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full text-left px-4 py-2 hover:bg-gray-800 transition"
          >
            Logout
          </button>
        </div>
      )}

    </div>
  )
}