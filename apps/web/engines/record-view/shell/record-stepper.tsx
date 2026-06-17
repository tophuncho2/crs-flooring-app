"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"

const STEP_BUTTON_CLASS_NAME =
  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-[var(--panel-border)] bg-[var(--panel-background)] text-[var(--foreground)]/80 transition hover:border-blue-500/40 hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-[var(--panel-border)] disabled:hover:text-[var(--foreground)]/80"

export type RecordStepperProps = {
  /** Text shown between the arrows (a record number, or a section name). */
  label: string
  /** Step backward. `null` disables the ◀ arrow (sequence edge). */
  onPrevious: (() => void) | null
  /** Step forward. `null` disables the ▶ arrow (sequence edge). */
  onNext: (() => void) | null
  /** Accessible label for the ◀ button. Defaults to "Previous". */
  previousAriaLabel?: string
  /** Accessible label for the ▶ button. Defaults to "Next". */
  nextAriaLabel?: string
  className?: string
}

/**
 * The bare `◀ <label> ▶` stepper button group. A dumb/passive control: the
 * consumer decides what "previous" / "next" mean and supplies the label; null
 * callbacks disable an edge arrow. Carries no portal and no discard guard —
 * `RecordStepperPortal` wraps this for the global top-bar record nav (and owns
 * the swap-discard dialog there), while in-place consumers (e.g. a section's
 * mode toggle) render it directly and own their own dirty guard.
 */
export function RecordStepper({
  label,
  onPrevious,
  onNext,
  previousAriaLabel = "Previous",
  nextAriaLabel = "Next",
  className,
}: RecordStepperProps) {
  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border border-[var(--panel-border)] bg-[var(--panel-background)] p-1${
        className ? ` ${className}` : ""
      }`}
    >
      <button
        type="button"
        aria-label={previousAriaLabel}
        disabled={onPrevious === null}
        onClick={onPrevious ?? undefined}
        className={STEP_BUTTON_CLASS_NAME}
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[4rem] px-1 text-center text-sm font-medium text-[var(--foreground)]/80">
        {label}
      </span>
      <button
        type="button"
        aria-label={nextAriaLabel}
        disabled={onNext === null}
        onClick={onNext ?? undefined}
        className={STEP_BUTTON_CLASS_NAME}
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
