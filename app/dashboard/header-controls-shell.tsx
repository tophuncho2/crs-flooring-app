"use client"

import { useEffect, useState } from "react"
import HeaderControls from "./header-controls"
import type { HeaderControlsProps } from "./header-controls"

export default function HeaderControlsShell(props: HeaderControlsProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return <HeaderControls {...props} />
}
