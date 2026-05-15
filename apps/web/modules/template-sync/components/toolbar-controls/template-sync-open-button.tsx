"use client"

import { FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME } from "@/modules/shared/engines/common/display/accent-styles"

type Props = {
  disabled: boolean
  onClick: () => void
}

export function TemplateSyncOpenButton({ disabled, onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={FLOORING_PRIMARY_ACTION_BUTTON_COMPACT_CLASS_NAME}
    >
      Open
    </button>
  )
}
