"use client"

import { RefreshCw } from "lucide-react"
import { useHubPanel } from "@/modules/app-shell/components/hub-panel-provider"

// Header trigger for the unified hub + template-sync panel. The panel itself is
// mounted once by HubPanelProvider; this button only opens it on the cascade.
export function TemplateSyncButton() {
  const { openCascade } = useHubPanel()

  return (
    <button
      type="button"
      onClick={openCascade}
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
