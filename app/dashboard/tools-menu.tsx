"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Wrench } from "lucide-react"

export default function ToolsMenu({ canUseTools }: { canUseTools: boolean }) {
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

  if (!canUseTools) return null

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="
          w-10 h-10 rounded-full
          bg-[var(--panel-background)]
          border border-[var(--panel-border)]
          flex items-center justify-center
          hover:bg-[var(--panel-hover)]
          transition
          shadow-[0_0_6px_rgba(59,130,246,0.25)]
        "
      >
        <Wrench size={18} className="text-blue-500" />
      </button>

      {open && (
        <div
          className="
            absolute right-0 mt-2 w-44
            bg-[var(--panel-background)]
            border border-[var(--panel-border)]
            rounded-lg
            shadow-[0_0_12px_rgba(59,130,246,0.15)]
            overflow-hidden
            text-sm
          "
        >
          <button
            onClick={() => {
              router.push("/dashboard/estimator")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Estimator
          </button>
          <button
            onClick={() => {
              router.push("/dashboard/products")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Products
          </button>
          <button
            onClick={() => {
              router.push("/dashboard/invoices")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Invoices
          </button>
          <button
            onClick={() => {
              router.push("/dashboard/warehouse")
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2 hover:bg-[var(--panel-hover)] transition"
          >
            Warehouse
          </button>
        </div>
      )}
    </div>
  )
}
