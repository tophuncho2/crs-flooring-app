"use client"

const BUTTON_CLASS_NAME =
  "flex w-full items-center justify-center rounded-lg border border-sky-500/60 bg-[var(--panel-background)] px-4 py-2 text-sm font-semibold tracking-tight text-sky-700 shadow-sm transition hover:bg-sky-500/10 hover:border-sky-500 disabled:cursor-not-allowed disabled:opacity-50"

export type AddLaborPaymentButtonProps = {
  onClick?: () => void
  disabled?: boolean
}

export function AddLaborPaymentButton({ onClick, disabled }: AddLaborPaymentButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled ?? !onClick}
      className={BUTTON_CLASS_NAME}
    >
      + Labor Payment
    </button>
  )
}
