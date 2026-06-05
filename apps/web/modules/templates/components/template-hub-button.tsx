"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { buildTemplateHubHref } from "@/hooks/navigation"

// Header trigger that opens the template hub in its empty state (no template
// pre-selected). Rows/links open the same page with a template selected.
export function TemplateHubButton() {
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() => router.push(buildTemplateHubHref())}
      aria-label="Open template hub"
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
