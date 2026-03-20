"use client"

import { useSyncExternalStore } from "react"
import HeaderControls from "./header-controls"
import type { HeaderControlsProps } from "./header-controls"

export default function HeaderControlsShell(props: HeaderControlsProps) {
  const mounted = useSyncExternalStore(
    (callback) => {
      const timeoutId = window.setTimeout(callback, 0)
      return () => window.clearTimeout(timeoutId)
    },
    () => true,
    () => false,
  )

  if (!mounted) {
    return null
  }

  return <HeaderControls {...props} />
}
