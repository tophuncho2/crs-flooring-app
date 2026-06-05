"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"

// Header trigger that opens the template-sync page (its own record-view URL page).
export function TemplateSyncButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push("/dashboard/template-sync")}
      aria-label="Open template sync"
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
      <RefreshCw size={18} className="text-blue-500" />
    </button>
  )
}
