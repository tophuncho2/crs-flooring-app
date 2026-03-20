"use client"

import dynamic from "next/dynamic"
import type { HeaderControlsProps } from "./header-controls"

const HeaderControls = dynamic(() => import("./header-controls"), {
  ssr: false,
  loading: () => <div className="h-12 w-full" aria-hidden="true" />,
})

export default function HeaderControlsShell(props: HeaderControlsProps) {
  return <HeaderControls {...props} />
}
