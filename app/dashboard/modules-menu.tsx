"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function ModulesMenu({ role }: { role: string }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (role !== "BUILDER" && role !== "ADMIN") return null

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-10 h-10 rounded-full bg-[var(--panel-background)] border border-[var(--panel-border)] flex items-center justify-center hover:bg-[var(--panel-hover)] transition shadow-[0_0_6px_rgba(59,130,246,0.2)]"
        aria-label="Module menu"
      >
        <span className="h-3 w-3 rounded-sm border border-blue-500/70" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-[var(--panel-background)] border border-[var(--panel-border)] rounded-lg shadow-[0_0_12px_rgba(59,130,246,0.15)] overflow-hidden text-sm">
          <button
            onClick={() => {
              router.push("/dashboard/warehouse")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Warehouse
          </button>
          <button
            onClick={() => {
              router.push("/dashboard/imports")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Imports
          </button>
        </div>
      )}
    </div>
  )
}
