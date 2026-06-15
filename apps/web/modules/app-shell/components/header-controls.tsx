"use client"

import UserMenu from "./user-menu"

type HeaderControlsProps = {
  email: string
  role: string
}

export type { HeaderControlsProps }

export default function HeaderControls({ email, role }: HeaderControlsProps) {
  return (
    <div className="flex w-full max-w-full items-center justify-between gap-2 sm:gap-4">
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <div id="record-back-button-slot" className="contents" />
        <div id="record-stepper-slot" className="contents" />
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-4">
        <UserMenu email={email} role={role} />
      </div>
    </div>
  )
}
